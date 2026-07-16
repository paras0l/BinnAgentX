const preparationItems = [
  "阅读材料与任务负荷匹配",
  "先标记、解释，再获得最小提示",
  "把阅读中的思路带入自己的英文表达",
] as const;

export default function LearnerHomePage() {
  return (
    <main className="learner-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BinnAgent · 考研英语</p>
          <h1>语境实验室 × 表达实验室</h1>
        </div>
        <span className="environment-badge">技术 Spike</span>
      </header>

      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <p className="step-label">准备阶段</p>
          <h2 id="welcome-title">先读懂，再亲自写出来</h2>
          <p>
            这里不会替你完成答案。系统会先了解你的起点，让你自己尝试，再把帮助控制在刚好够用的范围。
          </p>
          <button type="button" disabled aria-describedby="prototype-note">
            开始首次体验
          </button>
          <p id="prototype-note" className="prototype-note">
            当前只建立工程骨架，学习流程尚未开放。
          </p>
        </div>

        <aside className="preparation-card" aria-label="首次体验将包含">
          <h3>首次体验将包含</h3>
          <ol>
            {preparationItems.map((item, index) => (
              <li key={item}>
                <span>{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="evidence-note" aria-labelledby="evidence-title">
        <h2 id="evidence-title">进步需要证据</h2>
        <p>一次完成只说明“这次做到了”；新材料、无提示和延迟表现才会逐步形成更强证据。</p>
      </section>
    </main>
  );
}
