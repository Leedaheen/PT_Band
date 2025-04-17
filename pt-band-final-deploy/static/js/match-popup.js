import openForm from '/static/js/form-popup.js';

export default function openMatchPopup(jobId) {
  // 1) 비밀번호 입력 모달 생성
  const modalHtml = `
    <div id="password-modal" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full">
        <h2 class="text-xl mb-4">비밀번호 입력</h2>
        <input id="password-input" type="password" placeholder="비밀번호" class="border p-2 w-full mb-4" />
        <div class="flex justify-end space-x-2">
          <button id="cancel-btn" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button id="submit-btn" class="bg-blue-500 text-white px-4 py-2 rounded">확인</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const removeModal = () => {
    const m = document.getElementById('password-modal');
    if (m) m.remove();
  };

  document.getElementById('cancel-btn').addEventListener('click', removeModal);

  document.getElementById('submit-btn').addEventListener('click', async () => {
    const password = document.getElementById('password-input').value;
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    // 2) 서버에 비밀번호 검증 요청
    const res = await fetch(`/verify-password/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.message || '비밀번호 검증에 실패했습니다.');
      removeModal();
      return;
    }
    removeModal();
    // 3) 매칭 팝업 열기 (기존 팝업 재사용)
    openMatchForm(data.job, password);
  });
}

// 매칭 상태 변경 폼 팝업 함수
function openMatchForm(job, password) {
  const parts = Array.isArray(job.part) ? job.part : [];
  const matched = Array.isArray(job.matched_parts) ? job.matched_parts : [];
  const optionsHtml = parts.map(p => `
    <label class="block mb-1">
      <input type="checkbox" name="match" value="${p}" ${matched.includes(p) ? 'checked' : ''} /> ${p}
    </label>`).join('');

  const formHtml = `
    <div id="match-modal" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full overflow-auto">
        <h2 class="text-xl mb-4">매칭 상태 변경</h2>
        <form id="match-form">
          <div class="mb-4">
            <p class="font-semibold">매칭 완료 할 파트 선택:</p>
            ${optionsHtml || '<p>선택 가능한 파트가 없습니다.</p>'}
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" id="close-match-btn" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
            <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', formHtml);

  document.getElementById('close-match-btn').addEventListener('click', () => {
    const m = document.getElementById('match-modal'); if (m) m.remove();
  });

  document.getElementById('match-form').addEventListener('submit', async e => {
    e.preventDefault();
    const selected = [...document.querySelectorAll('#match-modal input[name="match"]:checked')].map(i => i.value);
    const res = await fetch(`/update/${job.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, parts: selected })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      alert(result.message || '저장에 실패했습니다.');
    } else {
      alert('매칭 상태가 업데이트 되었습니다.');
      const m = document.getElementById('match-modal'); if (m) m.remove();
    }
  });
}
