let allPrizes = [];

        async function loadNobelPrizes() {
          try {
            const res = await fetch('/api/nobel/prizes');
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            allPrizes = data.prizes || [];
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

          renderGrid(list);
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

          grid.innerHTML = list.map(p => {
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
        }

        document.addEventListener('DOMContentLoaded', loadNobelPrizes);
