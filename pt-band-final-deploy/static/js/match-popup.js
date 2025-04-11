// static/js/match-popup.js
export default async function openMatchPopup(index, supabase) {
  console.log("▶️ openMatchPopup 호출:", { index, supabase });

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

  // 3) 비밀번호 검증 (서비스 키 없이 저장된 해시 비교 불가능 → 테스트용 plain 비교)
  if (job.password !== pw) {
    return alert("비밀번호가 일치하지 않습니다.");
  }

  // 4) 매칭 옵션 렌더링 준비
  const parts        = job.part || [];
  const matchedParts = job.matched_parts || [];
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
      <input type="text" name="team" value="${job.team||''}"
             placeholder="팀명" class="border p-1 w-full mb-2"/>
      <input type="text" name="location" value="${job.location||''}"
             placeholder="위치" class="border p-1 w-full mb-2"/>
      <select required name="type" class="border p-1 w-full mb-2">
        <option value="구인" ${job.type==='구인'?'selected':''}>구인</option>
        <option value="구직" ${job.type==='구직'?'selected':''}>구직</option>
      </select>
      <input type="text" name="age" value="${job.age||''}"
             placeholder="연령대" class="border p-1 w-full mb-2"/>
      <select required name="region" class="border p-1 w-full mb-2">
        <option value="경기도 > 평택시" ${job.region==="경기도 > 평택시"?'selected':''}>경기도 > 평택시</option>
        <option value="경기도 > 오산시" ${job.region==="경기도 > 오산시"?'selected':''}>경기도 > 오산시</option>
        <option value="경기도 > 화성시" ${job.region==="경기도 > 화성시"?'selected':''}>경기도 > 화성시</option>
        <option value="경기도 > 안성시" ${job.region==="경기도 > 안성시"?'selected':''}>경기도 > 안성시</option>
        <option value="서울특별시 > 강남구" ${job.region==="서울특별시 > 강남구"?'selected':''}>서울특별시 > 강남구</option>
        <option value="부산광역시 > 해운대구" ${job.region==="부산광역시 > 해운대구"?'selected':''}>부산광역시 > 해운대구</option>
      </select>
      <label class="block mb-2">
        <input type="checkbox" name="pinned" value="true"
               ${job.pinned ? "checked" : ""}/>
        상단 고정
      </label>
      <textarea name="intro" maxlength="100" placeholder="소개글"
                class="border p-1 w-full mb-2">${job.intro||''}</textarea>
      <p class="mb-1 text-sm">✅ 매칭 완료할 파트를 선택하세요:</p>
      ${partOptions}
      <div class="mt-3 text-right">
        <button type="submit" class="bg-green-600 text-white px-3 py-1 rounded">
          저장
        </button>
      </div>
    </form>
  `;
  document.body.appendChild(popup);

  // 6) 닫기 버튼 이벤트
  popup.querySelector('#close-match-btn')
       .addEventListener('click', () => popup.remove());

  // 7) 폼 제출 처리
  popup.querySelector('#match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    const selected = [...popup.querySelectorAll('input[name="match"]:checked')]
      .map(i => i.value);
    const isMatched = selected.length === parts.length;

    const updates = {
      team:          form.get('team'),
      location:      form.get('location'),
      type:          form.get('type'),
      age:           form.get('age'),
      region:        form.get('region'),
      intro:         form.get('intro'),
      pinned:        form.get('pinned') === 'true',
      matched_parts: selected,
      is_matched:    isMatched
    };

    console.log("🔽 업데이트할 데이터:", updates);
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', index)
      .select();
    console.log("🔼 Supabase 응답:", { data, error });

    if (error) {
      console.error("❌ 저장 실패:", error);
      alert("저장 실패: " + error.message);
    } else {
      console.log("✅ 저장 성공:", data);
      popup.remove();
      // Realtime 구독으로 자동 리스트 갱신
    }
  });
}
