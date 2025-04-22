// match-popup.js
// 글 수정 + 매칭 상태 변경 (관리자 PIN 고정 포함)
// -------------------------------------------------

// ✨ 1. 유틸 ─────────────────────────────────────────
/** 배열·JSON·null 어떤 입력이 와도 안전하게 배열 반환 */
function safeParseArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try { return JSON.parse(data); } catch { return []; }
}

/** SHA‑256 해시 → 64자리 hex 문자열 반환 */
async function hashSHA256(str) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  );
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ✨ 2. 팝업 진입점 ──────────────────────────────────
export default function openMatchPopup(jobId) {
  lockScroll(true);        // 페이지 스크롤 잠금
  showPasswordModal(jobId);
}

// ✨ 3. 비밀번호 모달 ────────────────────────────────
function showPasswordModal(jobId) {
  const pwModal = document.createElement('div');
  pwModal.id = 'password-modal';
  pwModal.className =
    'fixed inset-0 z-50 flex items-center justify-center bg-gray-800/60';
  pwModal.innerHTML = `
    <div id="pw-box" class="bg-white rounded shadow-lg p-6 w-80">
      <h2 class="text-lg font-semibold mb-4">비밀번호 확인</h2>
      <input id="pw-input" type="password" maxlength="12"
             placeholder="비밀번호 (4자리 또는 관리자)"
             class="border w-full p-2 mb-4" />
      <div class="flex justify-end gap-2">
        <button id="pw-cancel" class="bg-gray-500 text-white px-3 py-1 rounded">
          취소
        </button>
        <button id="pw-submit" class="bg-blue-600 text-white px-3 py-1 rounded">
          확인
        </button>
      </div>
    </div>`;

  document.body.appendChild(pwModal);

  // 외부 클릭
  pwModal.addEventListener('click', e => {
    if (e.target === pwModal) closeModal(pwModal);
  });
  document.getElementById('pw-box').addEventListener('click', e => e.stopPropagation());

  // ✨ 취소 버튼으로 닫기
  pwModal.querySelector('#pw-cancel')
        .addEventListener('click', () => closeModal(pwModal));

  // 제출
  document.getElementById('pw-submit').addEventListener('click', async () => {
    const pw = (document.getElementById('pw-input').value || '').trim();
    if (pw.length < 4) return alert('비밀번호는 4자리 이상이어야 합니다.');

    try {
      const hashed = await hashSHA256(pw);
      const res = await fetch(`/api/verify-password/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hashed })
      });
      const { success, message, job, is_admin } = await res.json();
      if (!success) throw new Error(message || '비밀번호가 일치하지 않습니다.');

      closeModal(pwModal);
      showEditForm(job, hashed, is_admin);
    } catch (err) {
      alert(err.message);
    }
  });
}

// ✨ 4. 글 수정·매칭 변경 폼 ─────────────────────────
function showEditForm(job, passwordHash, isAdmin) {
  const modal = document.createElement('div');
  modal.id = 'match-modal';
  modal.className =
    'fixed inset-0 z-50 flex items-center justify-center bg-gray-800/60';

  const parts      = safeParseArray(job.part);
  const matchedNow = safeParseArray(job.matched_parts);

  modal.innerHTML = `
    <div id="match-box"
         class="bg-white rounded shadow-lg p-6 w-full max-w-md
                max-h-[80vh] overflow-y-auto">
      <h2 class="text-lg font-semibold mb-4">글 수정 / 매칭 상태 변경</h2>

      <form id="edit-form" class="space-y-3">
        <!-- 기본 정보 -->
        <input name="team"     value="${job.team ?? ''}"
               placeholder="밴드명"        class="border p-2 w-full" />
        <input name="nickname" value="${job.nickname ?? ''}"
               placeholder="닉네임"        class="border p-2 w-full" />
        <input name="age"      value="${job.age ?? ''}"
               placeholder="연령대"        class="border p-2 w-full" />

        <!-- 지역 선택 -->
        <select name="region" class="border p-2 w-full">
          ${['경기도 > 평택시','경기도 > 오산시','경기도 > 화성시',
              '경기도 > 안성시','서울특별시 > 강남구']
            .map(r => `<option value="${r}" ${job.region===r?'selected':''}>${r}</option>`)
            .join('')}
        </select>

        <input name="location" value="${job.location ?? ''}"
               placeholder="연습실 위치"  class="border p-2 w-full" />
        <input name="fee"      value="${job.fee ?? ''}"
               placeholder="월 회비"      class="border p-2 w-full" />
        <input name="contact"  value="${job.contact ?? ''}"
               placeholder="연락처"        class="border p-2 w-full" />
        <textarea name="intro" maxlength="100"
                  placeholder="소개글 (100자 이내)"
                  class="border p-2 w-full">${job.intro ?? ''}</textarea>

        <!-- 매칭 파트 -->
        <div>
          <p class="font-semibold mb-1">매칭 완료할 파트 선택</p>
          ${parts.map(p => `
            <label class="block text-sm mb-0.5">
              <input type="checkbox" name="matched_part" value="${p}"
                     ${matchedNow.includes(p) ? 'checked' : ''}/>
              ${p}
            </label>`).join('')}
        </div>

        <!-- PIN 고정 (관리자만) -->
        ${isAdmin ? `
          <label class="inline-flex items-center mt-2">
            <input type="checkbox" name="pinned"
                   class="mr-2" ${job.pinned ? 'checked' : ''}/>
            <span class="text-sm">📌 상단 고정</span>
          </label>` : ''}

        <!-- 버튼 -->
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" id="cancel-edit"
                  class="bg-gray-500 text-white px-4 py-1.5 rounded">
            취소
          </button>
          <button type="submit"
                  class="bg-green-600 text-white px-4 py-1.5 rounded">
            저장
          </button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(modal);

  // 바깥 클릭으로 닫기
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
  document.getElementById('match-box').addEventListener('click', e => e.stopPropagation());

  // 취소 버튼으로 닫기
  modal.querySelector('#cancel-edit')
       .addEventListener('click', () => closeModal(modal));

  // 저장
  document.getElementById('edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const mpt = fd.getAll('matched_part');          // 체크된 파트 배열

    const payload = {
      password_hash: passwordHash,
      team:          fd.get('team'),
      nickname:      fd.get('nickname'),
      age:           fd.get('age'),
      region:        fd.get('region'),
      location:      fd.get('location'),
      fee:           fd.get('fee'),
      contact:       fd.get('contact'),
      intro:         fd.get('intro'),
      matched_parts: mpt,
      status:        mpt.length ? 'matched' : 'open',   // ★ 필터링용
      pinned:        isAdmin && fd.get('pinned') === 'on'
    };

    try {
      const res = await fetch(`/api/update/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const { success, message } = await res.json();
      if (!success) throw new Error(message || '저장 실패');

      alert('저장되었습니다.');
      closeModal(modal);
      if (window.App?.loadJobs) window.App.loadJobs();   // 리스트 새로고침
    } catch (err) {
      alert(err.message);
    }
  });
}

// ✨ 5. 공통 모달 유틸 ──────────────────────────────
function closeModal(el) {
  el.remove();
  lockScroll(false);
}
function lockScroll(bool) {
  document.body.style.overflow = bool ? 'hidden' : '';
}
