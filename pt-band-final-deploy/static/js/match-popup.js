// match-popup.js

export default async function openMatchPopup(jobId) {
  const supabase = App.supabase;

  // 비밀번호 입력 모달 생성
  const modalHtml = `
    <div id="password-modal" class="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full">
        <h2 class="text-xl mb-4">비밀번호 입력</h2>
        <input id="password-input" type="password" placeholder="비밀번호" class="border p-2 w-full mb-4"/>
        <div class="flex justify-end space-x-2">
          <button id="cancel-btn" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button id="submit-btn" class="bg-blue-500 text-white px-4 py-2 rounded">확인</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 확인 버튼 클릭 시 비밀번호 검증
  document.getElementById('submit-btn').addEventListener('click', async () => {
    const password = document.getElementById('password-input').value;

    // 비밀번호가 입력되지 않으면 경고 메시지 출력
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    // 해당 작업(구인/구직) 조회
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      alert('잘못된 데이터입니다.');
      return;
    }

    // 관리자 비밀번호 확인
    if (password === 'admin1234') {
      togglePinStatus(job, jobId);
    } else {
      // 일반 사용자 비밀번호 확인
      if (check_password_hash(job.password, password)) {
        togglePinStatus(job, jobId);
      } else {
        alert("비밀번호가 일치하지 않습니다.");
      }
    }
    
    // 모달 닫기
    document.getElementById('password-modal').remove();
  });

  // 취소 버튼 클릭 시 모달 닫기
  document.getElementById('cancel-btn').addEventListener('click', () => {
    document.getElementById('password-modal').remove();
  });
}

// 매칭 상태 변경 및 핀 토글
function togglePinStatus(job, jobId) {
  const newPinStatus = !job.pinned;

  // Supabase에서 핀 상태 업데이트
  App.supabase
    .from('jobs')
    .update({ pinned: newPinStatus })
    .eq('id', jobId)
    .then(() => {
      alert(`매칭상태 변경 완료! ${newPinStatus ? '상단 고정됨' : '상단 고정 해제됨'}`);
    })
    .catch((err) => {
      alert(`오류 발생: ${err.message}`);
    });
}
