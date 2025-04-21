import openForm from '/static/js/form-popup.js';

export default function openMatchPopup(jobId) {
  // 1) 비밀번호 입력 모달 생성
  const pwModal = document.createElement('div');
  pwModal.id = 'password-modal';
  pwModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50';
  pwModal.innerHTML = `
    <div id="password-modal-content" class="bg-white p-6 rounded shadow-lg max-w-sm w-full">
      <h2 class="text-xl font-semibold mb-4">비밀번호 확인</h2>
      <input id="password-input" type="password" placeholder="비밀번호" class="border p-2 w-full mb-4" />
      <div class="flex justify-end space-x-2">
        <button id="pw-cancel" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
        <button id="pw-submit" class="bg-blue-500 text-white px-4 py-2 rounded">확인</button>
      </div>
    </div>`;
  document.body.appendChild(pwModal);

  // 모달 이벤트 바인딩
  const content = document.getElementById('password-modal-content');
  content.addEventListener('click', e => e.stopPropagation());
  pwModal.addEventListener('click', () => pwModal.remove());
  document.getElementById('pw-cancel').addEventListener('click', e => { e.stopPropagation(); pwModal.remove(); });

  // 2) 비밀번호 검증
  document.getElementById('pw-submit').addEventListener('click', async e => {
    e.stopPropagation();
    const password = document.getElementById('password-input').value.trim();
    console.log('입력된 비밀번호:', password);
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    try {
      const url = `${window.location.origin}/verify-password/${jobId}`;
      console.log('Verify URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      console.log('verify-password 응답:', response.status, data);
      if (!response.ok) throw new Error(data.message || '비밀번호 검증 실패');
      pwModal.remove();
      renderEditForm(data.job, password);
    } catch (err) {
      console.error('비밀번호 검증 오류:', err);
      alert(err.message || '비밀번호 검증 중 오류가 발생했습니다.');
      // 모달 닫지 않고 재입력 가능하도록 유지
    }
  });
}

// 3) 글 수정 + 매칭 상태 변경 폼 렌더링
function renderEditForm(job, password) {
  const formModal = document.createElement('div');
  formModal.id = 'match-modal';
  formModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50';

  const allParts = Array.isArray(job.part) ? job.part : JSON.parse(job.part || '[]');
  const matched = Array.isArray(job.matched_parts) ? job.matched_parts : JSON.parse(job.matched_parts || '[]');
  const partOptions = allParts.map(part => `
    <label class="block mb-1">
      <input type="checkbox" name="match" value="${part}" ${matched.includes(part) ? 'checked' : ''}/> ${part}
    </label>`).join('');

  formModal.innerHTML = `
    <div id="match-modal-content" class="bg-white p-6 rounded shadow-lg max-w-md w-full overflow-auto">
      <h2 class="text-xl font-semibold mb-4">글 수정 및 매칭</h2>
      <form id="edit-form" class="space-y-3">
        <input name="team" value="${job.team || ''}" placeholder="밴드명" class="border p-2 w-full" />
        <input name="nickname" value="${job.nickname || ''}" placeholder="닉네임" class="border p-2 w-full" />
        <input name="age" value="${job.age || ''}" placeholder="연령대" class="border p-2 w-full" />
        <select name="region" class="border p-2 w-full">
          ${['경기도 > 평택시','경기도 > 오산시','경기도 > 화성시','경기도 > 안성시','서울특별시 > 강남구']
            .map(r => `<option value="${r}" ${job.region===r?'selected':''}>${r}</option>`)
            .join('')}
        </select>
        <input name="location" value="${job.location || ''}" placeholder="위치" class="border p-2 w-full" />
        <input name="fee" value="${job.fee || ''}" placeholder="월 회비" class="border p-2 w-full" />
        <input name="contact" value="${job.contact || ''}" placeholder="연락처" class="border p-2 w-full" />
        <textarea name="intro" placeholder="소개글" class="border p-2 w-full" maxlength="100">${job.intro || ''}</textarea>
        <div>
          <p class="font-semibold mb-2">매칭 완료할 파트 선택:</p>
          ${partOptions}
        </div>
        <div class="mb-3">
          <label class="inline-flex items-center">
            <input type="checkbox" name="pinned" class="mr-2" ${job.pinned ? 'checked' : ''}/>
            고정하기
          </label>
        </div>
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-edit" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(formModal);

  const content = document.getElementById('match-modal-content');
  content.addEventListener('click', e => e.stopPropagation());
  formModal.addEventListener('click', () => formModal.remove());
  document.getElementById('cancel-edit').addEventListener('click', e => { e.stopPropagation(); formModal.remove(); });

  // 4) 수정 저장
  document.getElementById('edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const selectedParts = Array.from(form.getAll('match'));
    const payload = {
      password,
      parts: selectedParts,
      team: form.get('team'),
      nickname: form.get('nickname'),
      age: form.get('age'),
      region: form.get('region'),
      location: form.get('location'),
      fee: form.get('fee'),
      contact: form.get('contact'),
      intro: form.get('intro'),
      pinned: Boolean(form.get('pinned'))
    };
    try {
      const url = `${window.location.origin}/update/${job.id}`;
      console.log('Update URL:', url, payload);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      console.log('update 응답:', response.status, result);
      if (!response.ok) throw new Error(result.message || '수정 실패');
      alert('수정 및 매칭이 완료되었습니다.');
      formModal.remove();
      // 업데이트 후 리스트 갱신
      App.loadJobs();
    } catch (err) {
      console.error('업데이트 오류:', err);
      alert(err.message);
    }
  });
}
