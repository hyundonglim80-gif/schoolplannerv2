// ============================================
// Firebase Firestore V2 초기화 설정
// ============================================
const firebaseConfig = {
  apiKey: "선생님의_API_KEY", // Firebase 콘솔 SDK 설정에서 발급받은 실제 apiKey 입력
  authDomain: "schoolplannerv2.firebaseapp.com",
  projectId: "schoolplannerv2",
  storageBucket: "schoolplannerv2.appspot.com",
  messagingSenderId: "선생님의_SENDER_ID", // 실제 messagingSenderId 입력
  appId: "선생님의_APP_ID" // 실제 appId 입력
};

// Firebase 초기화 및 Firestore DB 객체 생성
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentDate = new Date();
let currentView = localStorage.getItem('selectedView') || 'week';

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${currentView}`);
  if (activeBtn) activeBtn.classList.add('active');

  updateHeaderTitle();
  // 3단계에서 Firestore 연결 로직 구현 예정
});

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
}

function changeView(view) {
  currentView = view;
  localStorage.setItem('selectedView', view);

  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${view}`).classList.add('active');
  updateHeaderTitle();
}

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

function getWeekStartEnd(date) {
  let start = new Date(date);
  let day = start.getDay();
  let diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  let end = new Date(start);
  end.setDate(start.getDate() + 4);
  return {start, end};
}
