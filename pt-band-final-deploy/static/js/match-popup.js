// static/js/match-popup.js
export default async function openMatchPopup(index) {
  // 전역 App.supabase 사용
  const supabase = window.App.supabase;
  console.log("▶️ match-popup 호출:", { index, supabase });

  // 1) 비밀번호 입력 모달 표시
  showPasswordModal(index);

  // 2) 비밀번호 모달 함수
  async function showPasswordModal(index) {
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

    // 확인 버튼 클릭 시 비밀번호 확인
    document.getElementById('submit-btn').addEventListener('click', async () => {
      const password = document.getElementById('password-input').value;
      if (!password) return alert('비밀번호를 입력해주세요.');

      const { data: job, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', index)
        .single();
      if (fetchError) {
        console.error("❌ 글 조회 오류:", fetchError);
        return alert("오류 발생: " + fetchError.message);
      }

      // 관리자 비밀번호 확인
      const isAdmin = password === 'admin1234';
      if (!isAdmin && job.password !== password) {
        return alert("비밀번호가 일치하지 않습니다.");
      }

      // 비밀번호 확인 후 팝업 실행
      openMatchPopupForm(job);
      document.getElementById('password-modal').remove();
    });

    // 취소 버튼 클릭 시 모달 닫기
    document.getElementById('cancel-btn').addEventListener('click', () => {
      document.getElementById('password-modal').remove();
    });
  }

  // 3) 매칭 상태 변경 팝업
  function openMatchPopupForm(job) {
    const parts = Array.isArray(job.part) ? job.part : [];
    const matchedParts = Array.isArray(job.matched_parts) ? job.matched_parts : [];
    const partOptions = parts.map(part => `
      <label class="block mb-1">
        <input type="checkbox" name="match" value="${part}"
               ${matchedParts.includes(part) ? 'checked' : ''}/>
        ${part}
      </label>
    `).join('');

    const isAdmin = password === 'admin1234'; // 관리자 여부 체크
    const pinnedField = isAdmin
      ? `<label class="block mb-2">
           <input type="checkbox" name="pinned" value="true"
                  ${job.pinned ? 'checked' : ''}/> 상단 고정
         </label>`
      : '';

    const popupHtml = `
      <div class="fixed top-1/2 left-1/2 bg-white p-4 rounded shadow z-50 max-w-sm w-full max-h-[90%] overflow-auto"
           style="transform: translate(-50%, -50%);">
        <div class="text-right mb-2">
          <button id="close-match-btn" class="text-sm text-red-500">✖ 닫기</button>
        </div>
        <form id="match-form">
          <p class="mb-2 text-sm font-semibold">글 수정 및 매칭완료 설정</p>

          <input type="text" name="team" value="${job.team||''}" placeholder="팀명" class="border p-1 w-full mb-2"/>
          <input type="text" name="location" value="${job.location||''}" placeholder="위치" class="border p-1 w-full mb-2"/>
          <select required name="type" class="border p-1 w-full mb-2">
            <option value="구인" ${job.type==='구인'?'selected':''}>구인</option>
            <option value="구직" ${job.type==='구직'?'selected':''}>구직</option>
          </select>
          <input type="text" name="age" value="${job.age||''}" placeholder="연령대" class="border p-1 w-full mb-2"/>
          <select required name="region" class="border p-1 w-full mb-2">
            <option value="경기도 > 평택시" ${job.region==="경기도 > 평택시"?'selected':''}>경기도 > 평택시</option>
            <option value="경기도 > 오산시" ${job.region==="경기도 > 오산시"?'selected':''}>경기도 > 오산시</option>
            <option value="경기도 > 화성시" ${job.region==="경기도 > 화성시"?'selected':''}>경기도 > 화성시</option>
            <option value="경기도 > 안성시" ${job.region==="경기도 > 안성시"?'selected':''}>경기도 > 안성시</option>
            <option value="서울특별시 > 강남구" ${job.region==="서울특별시 > 강남구"?'selected':''}>서울특별시 > 강남구</option>
            <option value="부산광역시 > 해운대구" ${job.region==="부산광역시 > 해운대구"?'selected':''}>부산광역시 > 해운대구</option>
          </select>

          ${pinnedField}

          <textarea name="intro" maxlength="100" placeholder="소개글" class="border p-1 w-full mb-2">${job.intro||''}</textarea>

          <p class="mb-1 text-sm">✅ 매칭 완료할 파트를 선택하세요:</p>
          ${partOptions}

          <div class="mt-3 text-right">
            <button type="submit" class="bg-green-600 text-white px-3 py-1 rounded">저장</button>
          </div>
        </form>
      </div>
    `;

    // 팝업 추가
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    // 닫기 버튼
    document.querySelector('#close-match-btn').onclick = () => {
      document.querySelector('.fixed').remove();
    };

    // 폼 저장 버튼 클릭 시
    document.querySelector('#match-form').onsubmit = async e => {
      e.preventDefault();
      const form = new FormData(e.target);
      const selected = [...document.querySelectorAll('input[name="match"]:checked')].map(i => i.value);
      const isMatched = selected.length === parts.length;

      const updates = {
        team: form.get('team'),
        location: form.get('location'),
        type: form.get('type'),
        age: form.get('age'),
        region: form.get('region'),
        intro: form.get('intro'),
        matched_parts: selected,
        is_matched: isMatched
      };
      if (isAdmin) updates.pinned = form.get('pinned') === 'true';

      const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', index);

      if (error) {
        console.error("❌ 저장 실패:", error);
        alert("저장 실패: " + error.message);
      } else {
        document.querySelector('.fixed').remove();
        App.loadJobs(); // 변경된 상태 반영
      }
    };
  }
}

