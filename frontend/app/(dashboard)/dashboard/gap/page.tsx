export default function GapDetailPage() {
  const categories = [
    {
      name: 'Technical Skills',
      skills: [
        { name: 'Docker', yours: 25, required: 70 },
        { name: 'Kubernetes', yours: 15, required: 65 },
        { name: 'GraphQL', yours: 30, required: 60 },
        { name: 'TypeScript', yours: 85, required: 70 },
        { name: 'React', yours: 90, required: 75 },
        { name: 'Next.js', yours: 80, required: 70 },
      ],
    },
    {
      name: 'DevOps & Tools',
      skills: [
        { name: 'CI/CD', yours: 55, required: 70 },
        { name: 'Git Advanced', yours: 70, required: 65 },
        { name: 'Monitoring', yours: 30, required: 50 },
      ],
    },
    {
      name: 'Soft Skills',
      skills: [
        { name: 'System Design', yours: 50, required: 75 },
        { name: 'Communication', yours: 75, required: 70 },
        { name: 'Leadership', yours: 60, required: 65 },
      ],
    },
  ];

  return (
    <div className="dash-page">
      {categories.map((cat) => (
        <div key={cat.name} className="dash-card">
          <div className="dash-card-header">
            <h3>{cat.name}</h3>
            <span className="dash-tag dash-tag-yellow">
              {cat.skills.filter((s) => s.yours < s.required).length} gaps
            </span>
          </div>
          <div className="dash-skill-list">
            {cat.skills.map((skill) => {
              const met = skill.yours >= skill.required;
              const color = met ? 'var(--green)' : skill.yours >= skill.required * 0.7 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={skill.name} className="dash-skill-row">
                  <span className="dash-skill-name">{skill.name}</span>
                  <div className="dash-skill-bar-bg">
                    <div className="dash-skill-bar-fill" style={{ width: `${skill.yours}%`, background: color }} />
                    <div className="dash-skill-threshold" style={{ left: `${skill.required}%` }} />
                  </div>
                  <span className="dash-skill-val" style={{ color }}>
                    {skill.yours}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
