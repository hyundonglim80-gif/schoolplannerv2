/**
 * ★ 주의: 반드시 1단계에서 새로 배포한 웹 앱 URL을 따옴표 안에 넣어주세요!
 */
//const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbztEDUhTVL_1zXG-r69oPNkpG10AgxAxtUbhzBzhV9TQ0y_RBdV5Q-K4MVn0NKEbZCy/exec";

// ============================================
// Firebase Firestore V2 초기화 설정
// ============================================
const firebaseConfig = {
  apiKey: "선생님의_API_KEY", // Firebase 콘솔에서 확인한 API 키
  authDomain: "schoolplannerv2.firebaseapp.com",
  projectId: "schoolplannerv2",
  storageBucket: "schoolplannerv2.appspot.com",
  messagingSenderId: "선생님의_SENDER_ID",
  appId: "선생님의_APP_ID"
};

// Firebase 앱 초기화 및 Firestore 객체 생성
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// (참고: 기존 구글 앱스 스크립트 URL은 더 이상 사용하지 않으므로 주석 처리해 둡니다)
// const WEB_APP_URL = "https://script.google.com/...";

let currentDate = new Date();
// 저장된 보기 모드가 있으면 가져오고, 없으면 기본값 'week' 사용
let currentView = localStorage.getItem('selectedView') || 'week';

document.addEventListener("DOMContentLoaded", () => {
  // 저장된 뷰 모드 버튼에 active 클래스 적용
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${currentView}`);
  if (activeBtn) activeBtn.classList.add('active');

  updateHeaderTitle();
  fetchSchedule();
  setupMemoListener();
});

// 네비게이션: 이전, 오늘, 다음 달력 이동
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
  fetchSchedule();
}

// 뷰 전환: 월, 주, 일
function changeView(view) {
  currentView = view;
  localStorage.setItem('selectedView', view); // 선택한 보기 모드를 브라우저에 저장!

  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${view}`).classList.add('active');
  updateHeaderTitle();
  fetchSchedule();
}

// 제목 업데이트
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
  start.setDate(start.getDate() - startDay); // 캘린더 앞쪽 빈칸(이전달) 채우기
  let endDay = end.getDay();
  end.setDate(end.getDate() + (6 - endDay)); // 캘린더 뒤쪽 빈칸(다음달) 채우기
  return {start, end};
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 구글 앱스 스크립트에서 데이터 받아오기
function fetchSchedule() {
  document.getElementById('loading').style.display = 'block';
  
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

  const url = `${WEB_APP_URL}?start=${formatDate(start)}&end=${formatDate(end)}`;

  fetch(url)
    .then(res => res.json())
    .then(result => {
      document.getElementById('loading').style.display = 'none';
      if(result.status === 'success') {
        renderData(result.data);
      } else {
        alert("데이터를 불러오는데 실패했습니다.");
      }
    })
    .catch(err => {
      document.getElementById('loading').style.display = 'none';
      console.error(err);
      alert("서버와 통신할 수 없습니다.");
    });
}

// 뷰 모드에 따른 분기 렌더링
function renderData(dataList) {
  if (currentView === 'week') renderWeek(dataList);
  else if (currentView === 'month') renderMonth(dataList);
  else renderDay(dataList);
}

// 텍스트상자 높이 자동 조절 공통 함수
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
// [주 보기] 오리지널 세로형 시트 레이아웃 렌더링
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
    if(d.getDay() === 0 || d.getDay() === 6) return; // 주간 계획표에서는 토/일 제거

    // 일점 내용의 엔터(\n)를 HTML 줄바꿈(<br>)으로 변환
    let formattedEvent = dayData.academicEvent ? String(dayData.academicEvent).replace(/\n/g, '<br>') : '';

    for (let i = 1; i <= 6; i++) {
      html += `<tr>`;
      if (i === 1) {
        html += `<td rowspan="6" class="date-cell" style="text-align: center; vertical-align: middle;">${dayData.month}.<br>${dayData.day}.<br>${dayData.dayOfWeek}</td>`;
        html += `<td rowspan="6" class="event-cell">${formattedEvent}</td>`;
      }
      
      let cls = dayData.classes[i] || '';
      let memo = (dayData.memos && dayData.memos[i]) ? String(dayData.memos[i]) : '';
      memo = memo.replace(/<br\s*\/?>/gi, '\n');

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
  
  // ★ 셀 속성 및 폰트 크기 정리 실행!
  autoFitTextSize();
  
  // 화면에 그려진 후 메모 높이 자동 맞춤 실행
  adjustAllTextareas();
}

// ============================================
// [일 보기] 하루 상세 레이아웃 렌더링
// ============================================
function renderDay(dataList) {
  const dayData = dataList[0];
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
    let cls = dayData.classes[i] || '';
    let memo = (dayData.memos && dayData.memos[i]) ? String(dayData.memos[i]) : '';
    memo = memo.replace(/<br\s*\/?>/gi, '\n');

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
  
  // ★ 셀 속성 및 폰트 크기 정리 실행!
  autoFitTextSize();
  
  // 화면에 그려진 후 메모 높이 자동 맞춤 실행
  adjustAllTextareas();
}

// ============================================
// [월 보기] 캘린더 그리드 레이아웃 렌더링
// ============================================
function renderMonth(dataList) {
  // 1. 그리드를 7열(일~토)에서 5열(월~금)로 변경하기 위해 CSS 스타일이나 구조를 맞춤
  let html = `<div class="cal-grid" style="grid-template-columns: repeat(5, 1fr);">`;
  
  // 2. 월~금 요일 헤더만 생성
  const days = ['월','화','수','목','금'];
  days.forEach(d => {
    html += `<div class="cal-header">${d}</div>`;
  });

  dataList.forEach(dayData => {
    let d = new Date(dayData.date);
    
    // 3. 토요일(6)과 일요일(0)은 월 보기 그리드에서 제외
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
    
    let classStrs = [];
    for(let i=1; i<=6; i++) {
      if(dayData.classes[i]) classStrs.push(`${i}교시:${dayData.classes[i]}`);
    }
    if(classStrs.length > 0) {
      html += `<div class="cal-class">${classStrs.join('<br>')}</div>`;
    }
    
    html += `</div>`;
  });
  html += `</div>`;
  document.getElementById('content-container').innerHTML = html;
}

// ============================================
// 메모 입력 시 구글 시트로 POST 저장 동기화 이벤트
// ============================================
function setupMemoListener() {
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
      const content = input.value;
      
      input.style.borderBottom = '2px solid #f59e0b'; 
      
      fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'saveMemo',
          date: date,
          period: period,
          content: content
        })
      })
      .then(res => res.json())
      .then(data => {
        if(data.status === 'success') {
          input.style.borderBottom = '2px solid #10b981';
          setTimeout(() => input.style.borderBottom = '', 1500);
        } else {
          alert('메모 저장에 실패했습니다.');
          input.style.borderBottom = '2px solid #ef4444';
        }
      })
      .catch(err => {
        console.error(err);
        input.style.borderBottom = '2px solid #ef4444';
      });
    }
  });
}

function autoFitTextSize() {
  document.querySelectorAll('table td').forEach(cell => {
    // 메모 입력창, 일정 칸, 수업 내용 칸은 한 줄 강제를 하지 않고 자연스러운 줄바꿈 허용!
    if (cell.querySelector('textarea') || cell.classList.contains('event-cell') || cell.classList.contains('class-cell')) {
      cell.style.whiteSpace = 'normal';
      cell.style.wordBreak = 'break-all';
      return;
    }

    // 그 외 단순 날짜/교시 셀만 글자 수에 맞춰 폰트 미세 조정
    let textLength = cell.innerText.trim().length;
    if (textLength > 10) {
      cell.style.fontSize = '11px';
    } else {
      cell.style.fontSize = '13px';
    }
  });
}
