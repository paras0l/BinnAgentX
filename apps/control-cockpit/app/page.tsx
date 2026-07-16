const views = [
  { name: "运行列表", detail: "状态、耗时、成本和公开错误" },
  { name: "运行回放", detail: "节点、重试、检查点和状态差异" },
  { name: "复核队列", detail: "拒判原因、证据引用和复核理由" },
  { name: "审计记录", detail: "操作者、命令、理由和目标版本" },
] as const;

export default function ControlHomePage() {
  return (
    <main className="control-shell">
      <header className="control-header">
        <div>
          <p>BINNAGENT / INTERNAL</p>
          <h1>开发者控制舱</h1>
        </div>
        <div className="identity-block">
          <span>隔离开发环境</span>
          <strong>developer_reviewer</strong>
        </div>
      </header>

      <section className="boundary-banner" aria-labelledby="boundary-title">
        <div>
          <p>当前边界</p>
          <h2 id="boundary-title">只观测合成运行，不接收真人数据</h2>
        </div>
        <span>默认只读</span>
      </section>

      <section className="view-grid" aria-label="控制舱首批视图">
        {views.map((view, index) => (
          <article key={view.name}>
            <span className="view-index">0{index + 1}</span>
            <h2>{view.name}</h2>
            <p>{view.detail}</p>
            <button type="button" disabled>
              尚未接入
            </button>
          </article>
        ))}
      </section>

      <footer>控制命令必须经过权限、理由、预期版本和审计校验；本界面不得直接修改数据库。</footer>
    </main>
  );
}
