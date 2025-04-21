// match-popup.js
// 매칭 상태 변경 + 게시글 수정 팝업 (관리자 핀 고정 기능 포함)
// ---------------------------------------------------------
// 1) 비밀번호 확인 → 2) 글 정보/권한 가져오기 → 3) 수정 & 매칭 완료 → 4) 저장
// ---------------------------------------------------------

export default function openMatchPopup(jobId) {
  // ---------- 1) 비밀번호 입력 모달 ----------
  const pwModal = document.createElement('div');
  pwModal.id = 'password-modal';
  pwModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50';
  pwModal.innerHTML = `
    <div id="password-modal-content" class="bg-white p-6 rounded shadow-lg max-w-sm w-full">
      <h2 class="text-xl font-semibold mb-4">비밀번호 확인</h2>
      <input id="password-input" type="password" placeholder="비밀번호 4자리" maxlength="4" class="border p-2 w-full mb-4" />
      <div class="flex justify-end space-x-2">
        <button id="pw-cancel" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
        <button id="pw-submit" class="bg-blue-600 text-white px-4 py-2 rounded">확인</button>
      </div>
    </div>`;
  document.body.appendChild(pwModal);

  // 모달 외부 클릭 닫기 & 취소 버튼
  pwModal.addEventListener('click', e => {
    if (e.target === pwModal || e.target.id === 'pw-cancel') pwModal.remove();
  });
  // 내용 클릭 전파 방지
  document.getElementById('password-modal-content').addEventListener('click', e => e.stopPropagation());

  // ---------- 2) 비밀번호 검증 ----------
  document.getElementById('pw-submit').addEventListener('click', async () => {
    const password = (document.getElementById('password-input').value || '').trim();
    if (password.length !== 4) return alert('비밀번호는 4자리여야 합니다.');

    try {
      const res = await fetch(`/verify-password/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const { success, message, job, is_admin } = await res.json();
      if (!success) throw new Error(message || '비밀번호가 일치하지 않습니다.');

      pwModal.remove();
      renderEditForm(job, password, is_admin);
    } catch (err) {
      alert(err.message);
    }
  });
}

// ---------- 3) 글 수정 + 매칭 상태 변경 폼 ----------
function renderEditForm(job, password, isAdmin) {
  const modal = document.createElement('div');
  modal.id = 'match-modal';
  modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50';

  // 파트 배열 변환
  const allParts = Array.isArray(job.part) ? job.part : (job.part ? JSON.parse(job.part) : []);
  const matchedParts = Array.isArray(job.matched_parts) ? job.matched_parts : (job.matched_parts ? JSON.parse(job.matched_parts) : []);

  // 파트 체크박스 HTML
  const partCheckboxes = allParts.map(p => `
    <label class="block mb-1 text-sm">
      <input type="checkbox" name="matched_part" value="${p}" ${matchedParts.includes(p) ? 'checked' : ''} /> ${p}
    </label>`).join('');

  modal.innerHTML = `
    <div id="match-modal-content" class="bg-white p-6 rounded shadow-lg max-w-md w-full overflow-auto">
      <h2 class="text-xl font-semibold mb-4">글 수정 / 매칭 상태 변경</h2>
      <form id="edit-form" class="space-y-3">
        <input name="team" value="${job.team || ''}" placeholder="밴드명" class="border p-2 w-full" />
        <input name="nickname" value="${job.nickname || ''}" placeholder="닉네임" class="border p-2 w-full" />
        <input name="age" value="${job.age || ''}" placeholder="연령대" class="border p-2 w-full" />
        <select name="region" class="border p-2 w-full">
          ${['경기도 > 평택시','경기도 > 오산시','경기도 > 화성시','경기도 > 안성시','서울특별시 > 강남구']
            .map(r => `<option value="${r}" ${job.region===r?'selected':''}>${r}</option>`).join('')}
        </select>
        <input name="location" value="${job.location || ''}" placeholder="연습실 위치" class="border p-2 w-full" />
        <input name="fee" value="${job.fee || ''}" placeholder="월 회비" class="border p-2 w-full" />
        <input name="contact" value="${job.contact || ''}" placeholder="연락처" class="border p-2 w-full" />
        <textarea name="intro" placeholder="소개글 (100자 이내)" maxlength="100" class="border p-2 w-full">${job.intro || ''}</textarea>

        <div>
          <p class="font-semibold mb-2">매칭 완료할 파트 선택:</p>
          ${partCheckboxes}
        </div>

        ${isAdmin ? `<div class="mb-2"><label class="inline-flex items-center text-sm"><input type="checkbox" name="pinned" class="mr-2" ${job.pinned ? 'checked' : ''}/>📌 상단 고정</label></div>` : ''}

        <div class="flex justify-end space-x-2 mt-4">
          <button type="button" id="cancel-edit" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(modal);

  // 모달 바깥 클릭 닫기 & 취소
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.id === 'cancel-edit') modal.remove();
  });
  document.getElementById('match-modal-content').addEventListener('click', e => e.stopPropagation());

  // ---------- 4) 저장 ----------
  document.getElementById('edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const matched = fd.getAll('matched_part');

    const payload = {
      password,
      team:       fd.get('team'),
      nickname:   fd.get('nickname'),
      age:        fd.get('age'),
      region:     fd.get('region'),
      location:   fd.get('location'),
      fee:        fd.get('fee'),
      contact:    fd.get('contact'),
      intro:      fd.get('intro'),
      matched_parts: matched,
      pinned:     isAdmin && fd.get('pinned') === 'on'
    };

    try {
      const res = await fetch(`/update/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const { success, message } = await res.json();
      if (!success) throw new Error(message || '저장 실패');
      alert('저장되었습니다.');
      modal.remove();
      if (window.App) window.App.loadJobs();
    } catch (err) {
      alert(err.message);
    }
  });
}
