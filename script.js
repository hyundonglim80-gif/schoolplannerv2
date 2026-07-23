// ============================================
// Firebase Firestore V2 초기화 설정
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyCUFuxkXPRLOLAQ8ZanuvR58EfVnDRqPQc", // 2단계에서 넣으셨던 본인 API Key
  authDomain: "schoolplannerv2.firebaseapp.com",
  projectId: "schoolplannerv2",
  storageBucket: "schoolplannerv2.appspot.com",
  messagingSenderId: "91415453413",
  appId: "1:91415453413:web:9d62e03bc686a537ccfe0c"
};

// Firebase 초기화 및 Firestore DB 객체 생성
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentDate = new Date();
let currentView = localStorage.getItem('selectedView') || 'week';
let unsubscribeMemoListener = null; // 실시간 리스너 해제용 변수

document.addEventListener("DOMContentLoaded", () => {
  // 보기 모드 버튼 활성화
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${currentView}`);
  if (activeBtn) activeBtn.classList.add('active');

  updateHeaderTitle();
  loadDataAndSubscribe();
  setupMemoInputListener();
});

// 네비게이션: 이전, 오늘, 다음 이동
function navigate(dir) {
  if (dir === 0) {
    currentDate = new Date();
  } else {
    if (currentView === 'month') {
      currentDate.setMonth(currentDate.getMonth() + dir);
    } else if (currentView === 'week') {
      currentDate.setDate(currentDate.getDate() + (dir * 7));
    } else {
      currentDate.setDate(currentDate.getDate() + dir);
    }
  }
  updateHeaderTitle();
  loadDataAndSubscribe();
}

// 뷰 전환: 월, 주, 일
function changeView(view) {
  currentView = view;
  localStorage.setItem('selectedView', view);

  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${view}`).classList.add('active');
  updateHeaderTitle();
  loadDataAndSubscribe();
}

// 상단 날짜 제목 업데이트
function updateHeaderTitle() {
  const titleEl = document.getElementById('date-title');
  if (currentView === 'month') {
    titleEl.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth()+1}월`;
  } else if (currentView === 'week') {
    const {start, end} = getWeekStartEnd(currentDate);
    titleEl.textContent = `${start.getMonth()+1}월 ${start.getDate()}일 ~ ${end.getMonth()+1}월 ${end.getDate()}일`;
  } else {
    const days = ['일','월','화','수','목','금','토'];
    titleEl.textContent = `${currentDate.getMonth()+1}월 ${currentDate.getDate()}일 (${days[currentDate.getDay()]})`;
  }
}

// 날짜 범위 계산 유틸
function getWeekStartEnd(date) {
  let start = new Date(date);
  let day = start.getDay();
  let diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준
  start.setDate(diff);
  let end = new Date(start);
  end.setDate(start.getDate() + 4); // 금요일
  return {start, end};
}

function getMonthStartEnd(date) {
  let start = new Date(date.getFullYear(), date.getMonth(), 1);
  let end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  let startDay = start.getDay();
  start.setDate(start.getDate() - startDay);
  let endDay = end.getDay();
  end.setDate(end.getDate() + (6 - endDay));
  return {start, end};
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================
// 🔥 [🔥핵심 1] Firestore 실시간 데이터 로딩 (onSnapshot)
// ============================================
function loadDataAndSubscribe() {
  document.getElementById('loading').style.display = 'block';

  // 기존 구독 중인 실시간 리스너가 있다면 해제 (메모리 누수 방지)
  if (unsubscribeMemoListener) {
    unsubscribeMemoListener();
  }

  let start, end;
  if(currentView === 'month') {
    let res = getMonthStartEnd(currentDate);
    start = res.start; end = res.end;
  } else if(currentView === 'week') {
    let res = getWeekStartEnd(currentDate);
    start = res.start; end = res.end;
  } else {
    start = new Date(currentDate); end = new Date(currentDate);
  }

  const startDateStr = formatDate(start);
  const endDateStr = formatDate(end);

  // Firestore 'memos' 컬렉션에서 해당 날짜 범위 데이터 실시간 구독
  unsubscribeMemoListener = db.collection('memos')
    .where('date', '>=', startDateStr)
    .where('date', '<=', endDateStr)
    .onSnapshot((snapshot) => {
      document.getElementById('loading').style.display = 'none';

      // 가져온 실시간 메모 데이터 맵 구성: { "2026-07-20": { 1: "메모내용", 2: "메모내용" } }
      const memoMap = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!memoMap[data.date]) memoMap[data.date] = {};
        memoMap[data.date][data.period] = data.content;
      });

      // 날짜 리스트 구조화 후 화면 렌더링
      const dataList = buildDataList(start, end, memoMap);
      renderData(dataList);
    }, (error) => {
      document.getElementById('loading').style.display = 'none';
      console.error("Firestore 실시간 동기화 에러:", error);
    });
}

// 선택된 날짜 범위 배열 구조 생성
function buildDataList(start, end, memoMap) {
  const list = [];
  let cur = new Date(start);
  const endObj = new Date(end);

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  while (cur <= endObj) {
    const dateStr = formatDate(cur);
    list.push({
      date: dateStr,
      year: cur.getFullYear(),
      month: cur.getMonth() + 1,
      day: cur.getDate(),
      dayOfWeek: dayNames[cur.getDay()],
      academicEvent: "", // (추후 캘린더 연동 영역)
      classes: {},      // (추후 시간표 연동 영역)
      memos: memoMap[dateStr] || {}
    });
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}

// 뷰 모드에 따른 분기 렌더링
function renderData(dataList) {
  if (currentView === 'week') renderWeek(dataList);
  else if (currentView === 'month') renderMonth(dataList);
  else renderDay(dataList);
}

// 텍스트상자 높이 자동 조절
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight) + 'px';
}

function adjustAllTextareas() {
  setTimeout(() => {
    document.querySelectorAll('.memo-input').forEach(el => autoResizeTextarea(el));
  }, 50);
}

// ============================================
// [주 보기] 오리지널 세로형 레이아웃
// ============================================
function renderWeek(dataList) {
  let html = `<table class="week-table">
  <thead>
    <tr>
      <th width="10%">날짜</th><th width="20%">일정</th><th width="3%">교시</th><th width="12%">수업</th><th width="55%">메모</th>
    </tr>
  </thead>
  <tbody>`;
  
  dataList.forEach(dayData => {
    let d = new Date(dayData.date);
    if(d.getDay() === 0 || d.getDay() === 6) return; // 토/일 제거

    let formattedEvent = dayData.academicEvent ? String(dayData.academicEvent).replace(/\n/g, '<br>') : '';

    for (let i = 1; i <= 6; i++) {
      html += `<tr>`;
      if (i === 1) {
        html += `<td rowspan="6" class="date-cell" style="text-align: center; vertical-align: middle;">${dayData.month}.<br>${dayData.day}.<br>${dayData.dayOfWeek}</td>`;
        html += `<td rowspan="6" class="event-cell">${formattedEvent}</td>`;
      }
      
      let cls = dayData.classes[i] || '';
      let memo = (dayData.memos && dayData.memos[i]) ? String(dayData.memos[i]) : '';

      let bgColor = '';
      if(cls.startsWith('3')) bgColor = 'style="background-color: #e8f5e9;"';
      else if(cls.startsWith('4')) bgColor = 'style="background-color: #fff9c4;"';
      
      html += `<td ${bgColor}>${i}</td>`;
      html += `<td ${bgColor} class="class-cell">${cls}</td>`;
      html += `<td ${bgColor}><textarea class="memo-input" data-date="${dayData.date}" data-period="${i}" placeholder="여기를 터치하여 메모 작성">${memo}</textarea></td>`;
      html += `</tr>`;
    }
  });

  html += `</tbody></table>`;
  document.getElementById('content-container').innerHTML = html;
  adjustAllTextareas();
}

// ============================================
// [일 보기] 하루 상세 레이아웃
// ============================================
function renderDay(dataList) {
  const dayData = dataList[0] || {};
  let formattedEvent = dayData.academicEvent ? String(dayData.academicEvent).replace(/\n/g, '<br>') : '일정 없음';

  let html = `<table class="day-table">
    <thead>
      <tr>
        <th width="25%">일정</th><th width="15%">교시</th><th width="20%">수업</th><th width="40%">메모</th>
      </tr>
    </thead>
    <tbody>`;
  
  for (let i = 1; i <= 6; i++) {
    html += `<tr>`;
    if (i === 1) {
      html += `<td rowspan="6" class="event-cell" style="font-size:15px;">${formattedEvent}</td>`;
    }
    let cls = (dayData.classes && dayData.classes[i]) || '';
    let memo = (dayData.memos && dayData.memos[i]) ? String(dayData.memos[i]) : '';

    let bgColor = '';
    if(cls.startsWith('3')) bgColor = 'style="background-color: #e8f5e9;"';
    else if(cls.startsWith('4')) bgColor = 'style="background-color: #fff9c4;"';
      
    html += `<td ${bgColor}>${i}</td>`;
    html += `<td ${bgColor} class="class-cell">${cls}</td>`;
    html += `<td ${bgColor}><textarea class="memo-input" data-date="${dayData.date}" data-period="${i}" placeholder="여기를 터치하여 메모 작성">${memo}</textarea></td>`;
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  document.getElementById('content-container').innerHTML = html;
  adjustAllTextareas();
}

// ============================================
// [월 보기] 캘린더 그리드 레이아웃
// ============================================
function renderMonth(dataList) {
  let html = `<div class="cal-grid" style="grid-template-columns: repeat(5, 1fr);">`;
  const days = ['월','화','수','목','금'];
  days.forEach(d => { html += `<div class="cal-header">${d}</div>`; });

  dataList.forEach(dayData => {
    let d = new Date(dayData.date);
    if (d.getDay() === 0 || d.getDay() === 6) return;

    let isCurrentMonth = d.getMonth() === currentDate.getMonth();
    let isToday = dayData.date === formatDate(new Date());
    let clsName = 'cal-cell';
    if (!isCurrentMonth) clsName += ' disabled';
    if (isToday) clsName += ' today';
    
    html += `<div class="${clsName}">
      <div class="cal-date">${dayData.day}</div>`;
    
    if(dayData.academicEvent) {
      html += `<div class="cal-event">${dayData.academicEvent}</div>`;
    }
    
    // 메모가 있는 교시 표시
    if(dayData.memos) {
      Object.keys(dayData.memos).forEach(p => {
        if(dayData.memos[p]) {
          html += `<div class="cal-class" style="color:#059669;">✏️ ${p}교시: ${dayData.memos[p]}</div>`;
        }
      });
    }
    
    html += `</div>`;
  });
  html += `</div>`;
  document.getElementById('content-container').innerHTML = html;
}

// ============================================
// 🔥 [🔥핵심 2] 메모 입력 시 Firestore로 초고속 실시간 저장 (set)
// ============================================
function setupMemoInputListener() {
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('memo-input')) {
      autoResizeTextarea(e.target);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('memo-input')) {
      const input = e.target;
      const date = input.getAttribute('data-date');
      const period = input.getAttribute('data-period');
      const content = input.value.trim();

      // 저장 중 표시 (주황색 테두리)
      input.style.borderBottom = '2px solid #f59e0b';

      // 문서 ID 키 구성: "2026-07-20_1"
      const docId = `${date}_${period}`;

      // Firestore 저장 실행 (Apps Script 거치지 않고 직접 통신!)
      db.collection('memos').doc(docId).set({
        date: date,
        period: parseInt(period),
        content: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
        // 성공 시 초록색 테두리 표시 후 원복
        input.style.borderBottom = '2px solid #10b981';
        setTimeout(() => input.style.borderBottom = '', 1500);
      })
      .catch((err) => {
        console.error("Firestore 메모 저장 실패:", err);
        input.style.borderBottom = '2px solid #ef4444';
        alert("메모 저장 실패: " + err.message);
      });
    }
  });
}
