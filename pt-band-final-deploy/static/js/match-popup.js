// match-popup.js

export default function openMatchPopup(jobId) {
  // 1) 비밀번호 입력 모달 생성
  const modalHtml = `
    <div id="password-modal" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full" id="password-modal-content">
        <h2 class="text-xl font-semibold mb-4">비밀번호 입력</h2>
        <input id="password-input" type="password" placeholder="비밀번호" class="border p-2 w-full mb-4" />
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-btn" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button type="button" id="submit-btn" class="bg-blue-500 text-white px-4 py-2 rounded">확인</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('password-modal');
  const content = document.getElementById('password-modal-content');

  // 클릭 이벤트 전파 차단
  const stop = e => e.stopPropagation();
  content.addEventListener('click', stop);

  // 모달 배경 클릭이나 취소 버튼 클릭 시 닫기
  modal.addEventListener('click', () => modal.remove());
  document.getElementById('cancel-btn').addEventListener('click', stop);
  document.getElementById('cancel-btn').addEventListener('click', () => modal.remove());

  // 확인 버튼 클릭 시 서버 검증
  document.getElementById('submit-btn').addEventListener('click', async stopPropagation => {
    stopPropagation.stopPropagation();
    const password = document.getElementById('password-input').value.trim();
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    try {
      const response = await fetch(`/verify-password/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (!response.ok) {
        alert(result.message || '비밀번호 검증에 실패했습니다.');
        modal.remove();
        return;
      }
      modal.remove();
      openMatchForm(result.job, password);
    } catch (error) {
      console.error('매칭 검증 오류:', error);
      alert('비밀번호 검증 중 오류가 발생했습니다.');
      modal.remove();
    }
  });
}

function openMatchForm(job, password) {
  // 2) 매칭 폼 생성
  const parts = Array.isArray(job.part) ? job.part : [];
  const matched = Array.isArray(job.matched_parts) ? job.matched_parts : [];
  const options = parts.map(p => `
    <label class="block mb-1">
      <input type="checkbox" name="match" value="${p}" ${matched.includes(p) ? 'checked' : ''}/> ${p}
    </label>`).join('');

  const formHtml = `
    <div id="match-modal" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full" id="match-modal-content">
        <h2 class="text-xl font-semibold mb-4">매칭 상태 변경</h2>
        <form id="match-form">
          <div class="mb-4">
            <p class="font-semibold mb-2">매칭 완료할 파트를 선택하세요:</p>
            <div id="match-options">${options || '<p>선택 가능한 파트가 없습니다.</p>'}</div>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" id="close-match-btn" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
            <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', formHtml);

  const modal = document.getElementById('match-modal');
  const content = document.getElementById('match-modal-content');
  content.addEventListener('click', e => e.stopPropagation());

  // 배경 및 취소 버튼 클릭 시 폼 닫기
  modal.addEventListener('click', () => modal.remove());
  document.getElementById('close-match-btn').addEventListener('click', e => { e.stopPropagation(); modal.remove(); });

  // 3) 저장 처리
  document.getElementById('match-form').addEventListener('submit', async e => {
    e.stopPropagation();
    e.preventDefault();
    const selected = Array.from(document.querySelectorAll('#match-options input[name="match"]:checked')).map(i => i.value);
    try {
      const response = await fetch(`/update/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, parts: selected })
      });
      const result = await response.json();
      if (!response.ok) {
        alert(result.message || '업데이트 실패');
        return;
      }
      alert('매칭 상태가 업데이트 되었습니다.');
      modal.remove();
    } catch (error) {
      console.error('저장 오류:', error);
      alert('매칭 저장 중 오류가 발생했습니다.');
    }
  });
}
