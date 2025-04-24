// match-popup.js
// 글 수정 + 매칭 상태 변경 팝업 (관리자 PIN 고정 포함)
// -------------------------------------------------

// 안전 파싱 유틸
function safeParseArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 스크롤 잠금 제어
function lockScroll(disable) {
  document.body.style.overflow = disable ? 'hidden' : '';
}

// 모달 닫기 유틸
function closeModal(modal) {
  modal.remove();
  lockScroll(false);
}

// 팝업 진입점
export default function openMatchPopup(jobId) {
  lockScroll(true);
  showPasswordModal(jobId);
}

// 비밀번호 확인 모달 표시
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

pwModal.addEventListener('click', e => {
  // 1) 배경을 클릭하거나, 2) pw-cancel 버튼 자체를 클릭했을 때 닫기
  if (e.target === pwModal || e.target.id === 'pw-cancel') {
    closeModal(pwModal);
  }
});

// 내부 박스 클릭은 모달 닫기 이벤트 전파를 막기
pwModal.querySelector('#pw-box')
  .addEventListener('click', e => e.stopPropagation());

// 그리고 취소 버튼에도 명시적으로 닫기 핸들러 달아주기
pwModal.querySelector('#pw-cancel')
  .addEventListener('click', () => closeModal(pwModal));


  pwModal.querySelector('#pw-submit').addEventListener('click', async () => {
    const rawPwd = (pwModal.querySelector('#pw-input').value || '').trim();
    if (rawPwd.length < 4) return alert('비밀번호는 4자리 이상이어야 합니다.');
    console.debug('[MatchPopup] verifying password for job', jobId, rawPwd);
    try {
      let res = await fetch(`/api/verify-password/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: rawPwd })
      });
      if (res.status === 404) {
        console.debug('[MatchPopup] fallback to /verify-password');
        res = await fetch(`/verify-password/${jobId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: rawPwd })
        });
      }
      const data = await res.json();
      console.debug('[MatchPopup] verify response', res.status, data);
      if (!res.ok || !data.success) throw new Error(data.message || '비밀번호 검증에 실패했습니다.');
      closeModal(pwModal);
      renderEditForm(data.job, rawPwd, data.is_admin);
    } catch (err) {
      console.error('[MatchPopup] verify-password error', err);
      alert(err.message);
    }
  });
}

// 수정/매칭 상태 변경 폼 렌더링
function renderEditForm(job, password, isAdmin) {
  const modal = document.createElement('div');
  modal.id = 'match-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-gray-800/60';

  const parts = safeParseArray(job.part);
  const matchedNow = safeParseArray(job.matched_parts);

  modal.innerHTML = `
    <div id="match-box" class="bg-white rounded shadow-lg p-6 w-full max-w-md max-h-[80vh] overflow-auto">
      <h2 class="text-lg font-semibold mb-4">글 수정 / 매칭 상태 변경</h2>
      <form id="edit-form" class="space-y-3">
        <input name="team"     value="${job.team || ''}"     placeholder="밴드명" class="border p-2 w-full" />
        <input name="nickname" value="${job.nickname || ''}" placeholder="닉네임" class="border p-2 w-full" />
        <input name="age"      value="${job.age || ''}"      placeholder="연령대" class="border p-2 w-full" />
        <select name="region" class="border p-2 w-full">
          ${['경기도 > 평택시','경기도 > 오산시','경기도 > 화성시','경기도 > 안성시','서울특별시 > 강남구']
            .map(r => `<option value="${r}" ${job.region===r?'selected':''}>${r}</option>`).join('')}
        </select>
        <input name="location" value="${job.location || ''}" placeholder="연습실 위치" class="border p-2 w-full" />
        <input name="fee"      value="${job.fee || ''}"      placeholder="월 회비" class="border p-2 w-full" />
        <input name="contact"  value="${job.contact || ''}"  placeholder="연락처" class="border p-2 w-full" />
        <textarea name="intro" maxlength="100" placeholder="소개글 (100자 이내)" class="border p-2 w-full">${job.intro || ''}</textarea>

        <div>
          <p class="font-semibold mb-1">매칭 완료할 파트 선택</p>
          ${parts.map(p => `
            <label class="block text-sm mb-1">
              <input type="checkbox" name="matched_part" value="${p}" ${matchedNow.includes(p)?'checked':''}/> ${p}
            </label>`).join('')}
        </div>

        ${isAdmin ? `
          <div class="mt-2">
            <label class="inline-flex items-center">
              <input type="checkbox" name="pinned" value="true" class="mr-2" ${job.pinned?'checked':''}/>📌 상단 고정
            </label>
          </div>
        ` : ''}

        <div class="flex justify-end space-x-2 pt-4">
          <button type="button" data-action="cancel" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); });
  modal.querySelector('#match-box').addEventListener('click', e => e.stopPropagation());
  modal.querySelector('button[data-action="cancel"]').addEventListener('click', () => closeModal(modal));

  modal.querySelector('#edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    // 체크된 파트 목록 수집
    const checkedEls = modal.querySelectorAll('input[name="matched_part"]:checked');
    const matched = Array.from(checkedEls).map(el => el.value);
    // 관리자 상단 고정 여부 확인
    let pinned = false;
    if (isAdmin) {
      const pinEl = modal.querySelector('input[name="pinned"]');
      pinned = !!(pinEl && pinEl.checked);
    }

    const payload = {
      password,
      team:     modal.querySelector('input[name="team"]').value,
      nickname: modal.querySelector('input[name="nickname"]').value,
      age:      modal.querySelector('input[name="age"]').value,
      region:   modal.querySelector('select[name="region"]').value,
      location: modal.querySelector('input[name="location"]').value,
      fee:      modal.querySelector('input[name="fee"]').value,
      contact:  modal.querySelector('input[name="contact"]').value,
      intro:    modal.querySelector('textarea[name="intro"]').value,
      matched_parts: matched,
      ...(isAdmin ? { pinned } : {})
    };
    console.log('[MatchPopup] update payload:', payload);

    try {
      const res = await fetch(`/api/update/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[MatchPopup] update response:', res.status, data);
      if (!res.ok || !data.success) throw new Error(data.message || '저장 실패');
      alert('저장되었습니다.');
      closeModal(modal);
      if (window.App) window.App.loadJobs();
    } catch (err) {
      console.error('[MatchPopup] update error', err);
      alert(err.message);
    }
  });
}
