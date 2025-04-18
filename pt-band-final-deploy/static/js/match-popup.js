// match-popup.js

export default function openMatchPopup(jobId) {
  // 1) 비밀번호 입력 모달 생성
  const modalHtml = `
    <div id="password-modal" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full">
        <h2 class="text-xl font-semibold mb-4">비밀번호 입력</h2>
        <input id="password-input" type="password" placeholder="비밀번호" class="border p-2 w-full mb-4" />
        <div class="flex justify-end space-x-2">
          <button id="cancel-btn" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button id="submit-btn" class="bg-blue-500 text-white px-4 py-2 rounded">확인</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const passwordModal = document.getElementById('password-modal');
  const stopPropagation = e => e.stopPropagation();

  // 버튼 이벤트 등록
  const cancelBtn = document.getElementById('cancel-btn');
  const submitBtn = document.getElementById('submit-btn');
  cancelBtn.addEventListener('click', e => { stopPropagation(e); removeModal(); });
  passwordModal.addEventListener('click', () => removeModal());
  passwordModal.querySelector('div > div').addEventListener('click', stopPropagation);

  submitBtn.addEventListener('click', async e => {
    stopPropagation(e);
    const password = document.getElementById('password-input').value.trim();
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    try {
      const res = await fetch(`/verify-password/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || '비밀번호 검증 실패');
      // 검증 성공 시
      removeModal();
      openMatchForm(data.job, password);
    } catch (err) {
      alert(err.message);
      removeModal();
    }
  });

  function removeModal() {
    const m = document.getElementById('password-modal');
    if (m) m.remove();
  }
}

// 매칭 상태 변경 폼 팝업 함수
function openMatchForm(job, password) {
  // 생성 시 이벤트 버블 방지
  const formHtml = `
    <div id="match-modal" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full overflow-auto">
        <h2 class="text-xl font-semibold mb-4">매칭 상태 변경</h2>
        <form id="match-form">
          <div class="mb-4">
            <p class="font-semibold mb-2">매칭 완료할 파트를 선택하세요:</p>
            <div id="match-options"></div>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" id="close-match-btn" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
            <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', formHtml);

  const matchModal = document.getElementById('match-modal');
  const optionsContainer = document.getElementById('match-options');

  // 파트 옵션 렌더링
  (Array.isArray(job.part) ? job.part : []).forEach(part => {
    const label = document.createElement('label');
    label.className = 'block mb-1';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'match';
    checkbox.value = part;
    if (Array.isArray(job.matched_parts) && job.matched_parts.includes(part)) checkbox.checked = true;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${part}`));
    optionsContainer.appendChild(label);
  });

  // 이벤트 등록
  const closeBtn = document.getElementById('close-match-btn');
  const matchFormDiv = matchModal.querySelector('div > div');
  closeBtn.addEventListener('click', e => { e.stopPropagation(); removeFormModal(); });
  matchModal.addEventListener('click', () => removeFormModal());
  matchFormDiv.addEventListener('click', e => e.stopPropagation());

  document.getElementById('match-form').addEventListener('submit', async e => {
    e.stopPropagation(); e.preventDefault();
    const selected = Array.from(document.querySelectorAll('#match-options input[name="match"]:checked'))
      .map(i => i.value);
    try {
      const res = await fetch(`/update/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, parts: selected })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || '업데이트 실패');
      alert('매칭 상태가 업데이트 되었습니다.');
      removeFormModal();
    } catch (err) {
      alert(err.message);
    }
  });

  function removeFormModal() {
    const m = document.getElementById('match-modal');
    if (m) m.remove();
  }
}
