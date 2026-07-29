export default function ChapterTree({ chapters, sections, activeChapter, activeSection, onSelectSection }) {
  return (
    <div>
      <h3 className="font-bold text-lg mb-3">目录</h3>
      {chapters.length === 0 ? (
        <p className="text-gray-500 text-sm">暂无章节</p>
      ) : (
        chapters.map((ch, idx) => {
          const chapterNum = idx + 1;
          const sectList = sections[idx] || [];
          return (
            <div key={idx} className="mb-4">
              <div className="font-semibold text-gray-700 mb-1">
                第{chapterNum}章 {ch}
              </div>
              {sectList.length === 0 ? (
                <p className="text-gray-400 text-xs ml-4">暂无小节</p>
              ) : (
                sectList.map((sec, secIdx) => {
                  const sectionNum = secIdx + 1;
                  const isActive = activeChapter === chapterNum && activeSection === sectionNum;
                  return (
                    <div
                      key={secIdx}
                      onClick={() => onSelectSection(chapterNum, sectionNum)}
                      className={`ml-4 py-1 px-2 text-sm rounded cursor-pointer hover:bg-gray-100 ${
                        isActive ? 'bg-blue-100 font-bold text-blue-800' : 'text-gray-600'
                      }`}
                    >
                      §{chapterNum}.{sectionNum} {sec}
                    </div>
                  );
                })
              )}
            </div>
          );
        })
      )}
    </div>
  );
}