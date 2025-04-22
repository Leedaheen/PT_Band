// match-popup.js
// 글 수정 + 매칭 상태 변경 (관리자 PIN 고정 포함)
// -------------------------------------------------

// 안전 파싱 유틸
function safeParseArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try { return JSON.parse(data); } catch { return []; }
}

// 팝업 진입점
export default function openMatchPopup(jobId) {
  lockScroll(true);
  showPasswordModal(jobId);
}

// 비밀번호 확인 모달
function showPasswordModal(jobId) {
  const pwModal = document.createElement('div');
  pwModal.id = 'password-modal';
  pwModal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-gray-800/60';
  pwModal.innerHTML = `
    <div id="pw-box" class="bg-white rounded shadow-lg p-6 w-80">
      <h2 class="text-lg font-semibold mb-4">비밀번호 확인</h2>
      <input id="pw-input" type="password" maxlength="12" placeholder="비밀번호 입력" class="border w-full p-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="pw-cancel" class="bg-gray-500 text-white px-3 py-1 rounded">취소</button>
        <button id="pw-submit" class="bg-blue-600 text-white px-3 py-1 rounded">확인</button>
      </div>
    </div>`;
  document.body.appendChild(pwModal);

  // 외부 클릭 또는 취소 버튼으로 닫기
  pwModal.addEventListener('click', e => {
    if (e.target === pwModal) closeModal(pwModal);
  });
  document.getElementById('pw-box').addEventListener('click', e => e.stopPropagation());
  pwModal.querySelector('#pw-cancel').addEventListener('click', () => closeModal(pwModal));

  // 확인 버튼
  pwModal.querySelector('#pw-submit').addEventListener('click', async () => {
    const rawPwd = document.getElementById('pw-input').value.trim();
    if (rawPwd.length < 4) return alert('비밀번호는 4자리 이상이어야 합니다.');

    try {
      const res = await fetch(`/api/verify-password/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: rawPwd })
      });
      const { success, message, job, is_admin } = await res.json();
      if (!success) throw new Error(message || '비밀번호가 일치하지 않습니다.');
      closeModal(pwModal);
      showEditForm(job, rawPwd, is_admin);
    } catch (err) {
      alert(err.message);
    }
  });
}

// 수정/매칭 상태 변경 폼
function showEditForm(job, passwordRaw, isAdmin) {
  const modal = document.createElement('div');
  modal.id = 'match-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-gray-800/60';

  const parts = safeParseArray(job.part);
  const matchedNow = safeParseArray(job.matched_parts);

  modal.innerHTML = `
    <div id="match-box" class="bg-white rounded shadow-lg p-6 w-full max-w-md max-h-[80vh] overflow-auto">
      <h2 class="text-lg font-semibold mb-4">글 수정 / 매칭 상태 변경</h2>
      <form id="edit-form" class="space-y-3">
        <input name="team"     value="${job.team ?? ''}" placeholder="밴드명" class="border p-2 w-full" />
        <input name="nickname" value="${job.nickname ?? ''}" placeholder="닉네임" class="border p-2 w-full" />
        <input name="age"      value="${job.age ?? ''}" placeholder="연령대" class="border p-2 w-full" />
        <select name="region" class="border p-2 w-full">
          ${['경기도 > 평택시','경기도 > 오산시','경기도 > 화성시','경기도 > 안성시','서울특별시 > 강남구']
            .map(r => `<option value="${r}" ${job.region===r?'selected':''}>${r}</option>`).join('')}
        </select>
        <input name="location" value="${job.location ?? ''}" placeholder="연습실 위치" class="border p-2 w-full" />
        <input name="fee"      value="${job.fee ?? ''}" placeholder="월 회비" class="border p-2 w-full" />
        <input name="contact"  value="${job.contact ?? ''}" placeholder="연락처" class="border p-2 w-full" />
        <textarea name="intro" maxlength="100" placeholder="소개글 (100자 이내)" class="border p-2 w-full">${job.intro ?? ''}</textarea>
        <div>
          <p class="font-semibold mb-1">매칭 완료할 파트 선택</p>
          ${parts.map(p => `
            <label class="block text-sm mb-1">
              <input type="checkbox" name="matched_part" value="${p}" ${matchedNow.includes(p)?'checked':''}/> ${p}
            </label>`).join('')}
        </div>
        ${isAdmin ? `<label class="inline-flex items-center"><input type="checkbox" name="pinned" class="mr-2" ${job.pinned?'checked':''}/>📌 상단 고정</label>`: ''}
        <div class="flex justify-end space-x-2 pt-4">
          <button type="button" id="cancel-edit" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  // 모달 닫기
  modal.addEventListener('click', e => { if (e.target===modal) closeModal(modal); });
  document.getElementById('match-box').addEventListener('click', e => e.stopPropagation());
  modal.querySelector('#cancel-edit').addEventListener('click', () => closeModal(modal));

  // 저장 처리
  document.getElementById('edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const matched = fd.getAll('matched_part');

    const payload = {
      password:      passwordRaw,
      team:          fd.get('team'),
      nickname:      fd.get('nickname'),
      age:           fd.get('age'),
      region:        fd.get('region'),
      location:      fd.get('location'),
      fee:           fd.get('fee'),
      contact:       fd.get('contact'),
      intro:         fd.get('intro'),
      matched_parts: matched,
      pinned:        isAdmin && fd.get('pinned')==='on'
    };

    try {
      const res = await fetch(`/api/update/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const { success, message } = await res.json();
      if (!success) throw new Error(message||'저장 실패');
      alert('저장되었습니다.');
      closeModal(modal);
      window.App.loadJobs();
    } catch (err) {
      alert(err.message);
    }
  });
}

// 공통 유틸
function closeModal(el) { el.remove(); lockScroll(false); }
function lockScroll(disable) { document.body.style.overflow = disable ? 'hidden' : ''; }
