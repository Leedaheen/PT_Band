// static/js/match-popup.js
export default async function openMatchPopup(index) {
  const supabase = window.App.supabase;
  console.log("▶️ match-popup 호출:", { index, supabase });

  // 1) 비밀번호 입력
  const pw = prompt("비밀번호를 입력하세요");
  if (!pw) return;

  // 2) 해당 글 가져오기
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', index)
    .single();
  if (fetchError) {
    console.error("❌ 글 조회 오류:", fetchError);
    return alert("오류 발생: " + fetchError.message);
  }

  // 3) 비밀번호 검증 (plain text 비교)
  if (job.password !== pw) {
    return alert("비밀번호가 일치하지 않습니다.");
  }

  // 4) 매칭 옵션 렌더링
  const parts        = Array.isArray(job.part) ? job.part : [];
  const matchedParts = Array.isArray(job.matched_parts) ? job.matched_parts : [];
  const partOptions  = parts.map(part => `
    <label class="block mb-1">
      <input type="checkbox" name="match" value="${part}"
             ${matchedParts.includes(part) ? 'checked' : ''}/>
      ${part}
    </label>
  `).join('');

  // 5) 팝업 생성
  const popup = document.createElement('div');
  popup.className = 'fixed top-1/2 left-1/2 bg-white p-4 rounded shadow z-50 max-w-sm w-full max-h-[90%] overflow-auto';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.innerHTML = `
    <div class="text-right mb-2">
      <button id="close-match-btn" class="text-sm text-red-500">✖ 닫기</button>
    </div>
    <form id="match-form">
      <p class="mb-2 text-sm font-semibold">글 수정 및 매칭완료 설정</p>
      <!-- 팀명, 위치, 타입, 연령대, 지역, 고정, 소개 입력 필드 생략 -->
      <p class="mb-1 text-sm">✅ 매칭 완료할 파트를 선택하세요:</p>
      ${partOptions}
      <div class="mt-3 text-right">
        <button type="submit" class="bg-green-600 text-white px-3 py-1 rounded">저장</button>
      </div>
    </form>
  `;
  document.body.appendChild(popup);

  // 6) 닫기
  popup.querySelector('#close-match-btn')
       .addEventListener('click', () => popup.remove());

  // 7) 저장
  popup.querySelector('#match-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const selected = [...popup.querySelectorAll('input[name="match"]:checked')].map(i => i.value);
    const isMatched = selected.length === parts.length;

    const updates = {
      /* 수정된 필드: team, location, type, age, region, intro, pinned */
      matched_parts: selected,
      is_matched:    isMatched
    };

    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', index);
    if (error) {
      console.error("❌ 저장 실패:", error);
      return alert("저장 실패: " + error.message);
    }
    popup.remove();
  });
}
