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

  // 모달 제거
  function removeModal() {
    const m = document.getElementById('password-modal');
    if (m) m.remove();
  }

  // 버튼 및 배경 클릭 이벤트
  document.getElementById('cancel-btn').addEventListener('click', e => { stopPropagation(e); removeModal(); });
  passwordModal.addEventListener('click', () => removeModal());
  passwordModal.querySelector('div > div').addEventListener('click', stopPropagation);

  // 2) 비밀번호 확인 로직
  document.getElementById('submit-btn').addEventListener('click', async e => {
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
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        console.error('Response not JSON:', text);
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
      }
      if (!res.ok || !data.success) {
        throw new Error(data.message || '비밀번호 검증 실패');
      }

      // 검증 성공
      removeModal();
      openMatchForm(data.job, password);
    } catch (err) {
      alert(err.message);
      removeModal();
    }
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
    <div id="match-modal" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full overflow-auto">
        <h2 class="text-xl font-semibold mb-4">매칭 상태 변경</h2>
        <form id="match-form">
          <div class="mb-4">
            <p class="font-semibold mb-2">매칭 완료할 파트를 선택하세요:</p>
            <div id="match-options">${optionsHtml || '<p>선택 가능한 파트가 없습니다.</p>'}</div>
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

  function removeFormModal() {
    const m = document.getElementById('match-modal');
    if (m) m.remove();
  }

  // 배경/취소 버튼 클릭 이벤트
  document.getElementById('close-match-btn').addEventListener('click', e => { e.stopPropagation(); removeFormModal(); });
  matchModal.addEventListener('click', () => removeFormModal());
  matchModal.querySelector('div > div').addEventListener('click', e => e.stopPropagation());

  // 4) 저장 처리
  document.getElementById('match-form').addEventListener('submit', async e => {
    e.stopPropagation(); e.preventDefault();
    const selected = Array.from(document.querySelectorAll('#match-options input[name="match"]:checked')).map(i => i.value);
    try {
      const res = await fetch(`/update/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, parts: selected })
      });
      let result;
      try {
        result = await res.json();
      } catch (parseError) {
        const text = await res.text();
        console.error('Response not JSON:', text);
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
      }
      if (!res.ok || !result.success) throw new Error(result.message || '업데이트 실패');
      alert('매칭 상태가 업데이트 되었습니다.');
      removeFormModal();
    } catch (err) {
      alert(err.message);
    }
  });
}
