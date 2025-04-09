// form-popup.js
export default function openForm(supabase) {
  // ... 팝업 생성 로직
  form.onsubmit = async e => {
    // ...
    await supabase.from('jobs').insert([payload]);
    popup.remove(); // 실시간 구독이 loadJobs()를 호출해서 화면이 갱신됨
  };
}

  const popup = document.createElement('div');
  popup.className = 'fixed top-1/2 left-1/2 bg-white p-4 rounded shadow z-50 max-w-sm w-full max-h-[90%] overflow-auto';
  popup.style.transform = 'translate(-50%, -50%)';

  popup.innerHTML = `
    <div class='text-right'>
      <button onclick='this.closest("div").remove()' class='text-sm text-red-500'>✖ 닫기</button>
    </div>
    <form id='new-post-form'>
      <p class='mb-2 text-sm font-semibold'>글 작성하기</p>
      <div class='mb-2'>
        <label class='block text-sm font-medium mb-1'>구분:</label>
        <select name='type' class='border p-1 w-full'>
          <option value='구인'>구인</option>
          <option value='구직'>구직</option>
        </select>
      </div>
      <div id='form-content'></div>
      <div class='mt-4 text-right'>
        <button type='submit' class='bg-blue-600 text-white px-3 py-1 rounded'>등록</button>
      </div>
    </form>`;

  document.body.appendChild(popup);

  const formTypeSelect = popup.querySelector('select[name="type"]');
  const formContent = popup.querySelector('#form-content');
  formTypeSelect.onchange = () => renderFormFields(formContent, formTypeSelect.value);
  renderFormFields(formContent, '구인');

  popup.querySelector('#new-post-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    const payload = {
      type: form.get('type'),
      team: form.get('team') || null,
      nickname: form.get('nickname') || null,
      age: form.get('age') || null,
      region: form.get('region') || '경기도 > 평택시',
      location: form.get('location') || null,
      fee: form.get('fee') || null,
      contact: form.get('contact') || null,
      intro: form.get('intro') || null,
      password: form.get('password'),
      part: form.getAll('part'),
      created_at: new Date().toISOString(),
      clicks: 0,
      is_matched: false,
      pinned: false
    };

    // Supabase에 삽입
    const { data, error } = await supabase
      .from('jobs')
      .insert([payload]);

    if (error) {
      console.error(error);
      alert('등록 실패: ' + error.message);
    } else {
      // 새 글이 올라오면 실시간 구독으로 자동 반영됩니다
      popup.remove();
    }
  };

  function renderFormFields(container, type) {
    const checklistHTML = ['보컬(남)', '보컬(여)', '드럼', '베이스', '기타', '키보드', '그 외']
      .map(part => `<label class='mr-2'><input type='checkbox' name='part' value='${part}' class='mr-1'/>${part}</label>`)
      .join(' ');

    const regionSelectHTML = `
      <select required name="region" class="border p-1 w-full mb-2">
        <option value="경기도 > 평택시" selected>경기도 > 평택시</option>
        <option value="경기도 > 오산시">경기도 > 오산시</option>
        <option value="경기도 > 화성시">경기도 > 화성시</option>
        <option value="경기도 > 안성시">경기도 > 안성시</option>
        <option value="서울특별시 > 강남구">서울특별시 > 강남구</option>
        <option value="부산광역시 > 해운대구">부산광역시 > 해운대구</option>
      </select>`;

    if (type === '구인') {
      container.innerHTML = `
        <input required name='team' placeholder='밴드명 필수' class='border p-1 w-full mb-2'/>
        <input required name='nickname' placeholder='오픈톡 닉네임 필수' class='border p-1 w-full mb-2'/>
        <input name='age' placeholder='멤버 연령대' class='border p-1 w-full mb-2'/>
        <div class='mb-2'>
          <label class='block mb-1'>구인 파트:</label>
          <div class='grid grid-cols-2 gap-4'>${checklistHTML}</div>
        </div>
        <input required name='location' placeholder='연습실 위치 (필수)' class='border p-1 w-full mb-2'/>
        ${regionSelectHTML}
        <input name='fee' placeholder='월 회비 선택' class='border p-1 w-full mb-2'/>
        <input required name='contact' placeholder='연락처 필수' class='border p-1 w-full mb-2'/>
        <textarea name='intro' placeholder='선호 장르 및 간단한 소개 (100자 이내)' maxlength='100' class='border p-1 w-full mb-2'></textarea>
        <input required name='password' type='password' maxlength='4' placeholder='비밀번호 4자리' class='border p-1 w-full mb-2'/>
      `;
    } else {
      container.innerHTML = `
        <input required name='nickname' placeholder='오픈톡 닉네임 (필수)' class='border p-1 w-full mb-2'/>
        <div class='mb-2'><label class='block mb-1'>구직 파트:</label>${checklistHTML}</div>
        <input required name='age' placeholder='나이' class='border p-1 w-full mb-2'/>
        ${regionSelectHTML}
        <input required name='contact' placeholder='연락처 (필수)' class='border p-1 w-full mb-2'/>
        <textarea name='intro' placeholder='선호 장르 및 간단한 소개 (100자 이내)' maxlength='100' class='border p-1 w-full mb-2'></textarea>
        <input required name='password' type='password' maxlength='4' placeholder='비밀번호 (4자리)' class='border p-1 w-full mb-2'/>
      `;
    }
  }
}
