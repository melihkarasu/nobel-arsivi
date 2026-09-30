let allPrizes = [];

        // Batch render durumu (682 kaydı tek seferde basmamak için)
        const RENDER_BATCH = 60;
        let filteredPrizes = [];
        let renderBatch = RENDER_BATCH;

        async function loadNobelPrizes() {
          try {
            // NA1: tüm arşivi sayfalarla çek — API meta.count ≈ 682, limit maks 100, offset sayfalama
            const firstRes = await fetch('https://api.nobelprize.org/2.1/nobelPrizes?limit=100&offset=0');
            if (!firstRes.ok) throw new Error('Nobel Vakfı API yanıt vermedi');
            const first = await firstRes.json();
            const total = (first.meta && Number(first.meta.count)) || 0;

            const offsets = [];
            for (let off = 100; off < total; off += 100) offsets.push(off);
            const rest = await Promise.allSettled(
              offsets.map(off =>
                fetch(`https://api.nobelprize.org/2.1/nobelPrizes?limit=100&offset=${off}`).then(r => r.json())
              )
            );

            const rawList = [...(first.nobelPrizes || [])];
            for (const r of rest) {
              if (r.status === 'fulfilled' && r.value && r.value.nobelPrizes) {
                rawList.push(...r.value.nobelPrizes);
              }
            }

            // yıl+kategoriye göre tekilleştir, en yeniden eskiye sırala
            const seen = new Set();
            allPrizes = rawList
              .filter(p => {
                const key = p.awardYear + '|' + (p.category && p.category.en);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .map(p => ({
                year: p.awardYear,
                category: (p.category && p.category.en) || '',
                categoryFullName: (p.categoryFullName && p.categoryFullName.en) || '',
                prizeAmount: p.prizeAmount || 0,
                laureates: (p.laureates || []).map(l => ({
                  id: l.id,
                  name: (l.knownName && l.knownName.en) || (l.orgName && l.orgName.en) || 'İsimsiz',
                  motivation: (l.motivation && l.motivation.en) || (p.topMotivation && p.topMotivation.en) || 'İnsanlığa üstün katkı.'
                }))
              }))
              .sort((a, b) => Number(b.year) - Number(a.year) || String(a.category).localeCompare(String(b.category)));

            // Not: Sabit Türk kayıtları kaldırıldı — tam veri setinde gerçek kayıtlar mevcut
            // (Orhan Pamuk 2006 Literature id 808, Aziz Sancar 2015 Chemistry id 923).

            document.getElementById('nobel-count-badge').innerText = allPrizes.length;

            document.getElementById('nobel-loading').classList.add('hidden');
            document.getElementById('nobel-grid').classList.remove('hidden');

            filterNobelPrizes();
          } catch(err) {
            document.getElementById('nobel-loading').innerHTML = '<span class="text-rose-500 font-medium text-sm">Nobel arşivi yüklenemedi: ' + err.message + '</span>';
          }
        }

        function filterNobelPrizes() {
          const q = (document.getElementById('nobel-search').value || '').trim().toLowerCase();
          const cat = document.getElementById('nobel-category-select').value;

          const list = allPrizes.filter(p => {
            const matchCat = cat === 'all' || p.category.toLowerCase() === cat.toLowerCase();
            const laureateNames = (p.laureates || []).map(l => l.name.toLowerCase()).join(' ');
            const motivations = (p.laureates || []).map(l => (l.motivation || '').toLowerCase()).join(' ');
            const matchQ = !q || laureateNames.includes(q) || motivations.includes(q) || String(p.year).includes(q) || p.category.toLowerCase().includes(q);
            return matchCat && matchQ;
          });

          filteredPrizes = list;
          renderBatch = RENDER_BATCH;
          renderGrid(list);
        }

        function showMoreNobel() {
          renderBatch += RENDER_BATCH;
          renderGrid(filteredPrizes);
        }

        function quickNobel(term) {
          document.getElementById('nobel-search').value = term;
          filterNobelPrizes();
        }

        function renderGrid(list) {
          const grid = document.getElementById('nobel-grid');
          if (list.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-12 text-center text-mistral-stone font-medium text-sm">Arama kriterlerine uygun Nobel kaydı bulunamadı.</div>';
            return;
          }

          const visible = list.slice(0, renderBatch);
          grid.innerHTML = visible.map(p => {
            const laureatesHtml = (p.laureates || []).map(l => `
              <div class="p-3 rounded-lg bg-mistral-cream/50 border border-mistral-beige-deep/80 space-y-1">
                <h4 class="font-bold text-sm font-editorial text-mistral-ink flex items-center gap-1.5">
                  <span>🎖️</span> ${l.name}
                </h4>
                <p class="text-xs text-mistral-slate leading-relaxed italic">
                  "${l.motivation}"
                </p>
              </div>
            `).join('');

            return `
              <div class="p-6 rounded-xl bg-white border border-mistral-hairline hover:border-mistral-orange/40 hover:shadow-md transition duration-200 flex flex-col justify-between group">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-bold text-mistral-orange uppercase tracking-wider">${p.category}</span>
                    <span class="px-2.5 py-0.5 rounded-full bg-mistral-cream text-mistral-ink border border-mistral-beige-deep text-xs font-bold">
                      ${p.year}
                    </span>
                  </div>

                  <h3 class="text-lg font-bold font-editorial text-mistral-ink mb-4">
                    ${p.categoryFullName || p.category + ' Ödülü'}
                  </h3>

                  <div class="space-y-2 mb-4">
                    ${laureatesHtml}
                  </div>
                </div>

                <div class="pt-3 border-t border-mistral-hairline flex items-center justify-between text-[11px] text-mistral-stone font-mono">
                  <span>💰 Ödül: ${Number(p.prizeAmount || 0).toLocaleString('en-US')} SEK</span>
                  <span class="text-mistral-orange font-bold font-sans">Nobel Vakfı Resmi</span>
                </div>
              </div>
            `;
          }).join('');

          if (list.length > renderBatch) {
            grid.innerHTML += `
              <button onclick="showMoreNobel()" class="col-span-full mx-auto px-6 py-3 rounded-xl bg-white border border-mistral-hairline hover:border-mistral-orange/40 text-sm font-bold text-mistral-ink transition">
                ${list.length - renderBatch} kaydı daha göster ▾
              </button>
            `;
          }
        }

        document.addEventListener('DOMContentLoaded', loadNobelPrizes);
