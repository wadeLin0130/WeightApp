import { useState } from 'react';
import { trendData, dateString } from './trend-data';
function Plot({ title, points, second, unit }) {
  const all = [...points, ...(second || [])];
  if (!all.length) return <section className="rounded-3xl p-5 bg-white dark:bg-[#1E1E1E]"><h2 className="text-sm">{title}</h2><p className="text-xs mt-3 opacity-60">尚無紀錄</p></section>;
  const min = Math.min(...all.map(p => p.value)), max = Math.max(...all.map(p => p.value));
  const low = Math.floor(min), high = Math.max(low + 1, Math.ceil(max));
  const times = all.map(p => Date.parse(p.date)), start = Math.min(...times), end = Math.max(...times);
  const xy = p => [38 + (Date.parse(p.date) - start) / (end - start || 1) * 270, 135 - (p.value - low) / (high - low) * 105];
  return <section className="rounded-3xl p-5 bg-white dark:bg-[#1E1E1E] border border-[#E8E4DF] dark:border-[#3A3A3A]">
    <h2 className="text-sm">{title}</h2><p className="text-xs opacity-60 mt-2">最近 {points.at(-1)?.value.toFixed(1)} {unit}{second && <><span className="ml-2 text-[#c4a495]">體重</span><span className="ml-2 text-[#7a9479]">七日平均</span></>}</p>
    <svg viewBox="0 0 320 165" role="img" aria-label={title} className="w-full my-3">{[low, high].map((v, i) => <g key={i}><line x1="38" x2="308" y1={i ? 30 : 135} y2={i ? 30 : 135} stroke="#d6d0c4" strokeDasharray="3 3"/><text x="2" y={i ? 34 : 139} fontSize="10" fill="currentColor">{v}</text></g>)}{[points, second].filter(Boolean).map((arr, i) => <g key={i}><polyline points={arr.map(p => xy(p).join(',')).join(' ')} fill="none" stroke={i ? '#7a9479' : '#c4a495'} strokeWidth="2"/>{arr.map(p => <circle key={p.date} cx={xy(p)[0]} cy={xy(p)[1]} r="2.5" fill={i ? '#7a9479' : '#c4a495'}><title>{p.date}: {p.value.toFixed(1)} {unit}</title></circle>)}</g>)}<text x="38" y="160" fontSize="9" fill="currentColor">{dateString(new Date(start))}</text><text x="308" y="160" fontSize="9" fill="currentColor" textAnchor="end">{dateString(new Date(end))}</text></svg>
    <details className="text-xs"><summary>查看數值</summary><div className="max-h-48 overflow-auto mt-2"><table className="w-full text-left"><thead><tr><th>日期</th><th>{unit}</th>{second && <th>七日平均</th>}</tr></thead><tbody>{points.map(p => <tr key={p.date}><td className="py-1">{p.date}</td><td>{p.value.toFixed(1)}</td>{second && <td>{second.find(s => s.date === p.date)?.value.toFixed(1)}</td>}</tr>)}</tbody></table></div></details>
  </section>;
}
export default function Trends({ records }) {
  const [range, setRange] = useState('1');
  const all = trendData(records);
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - Number(range));
  const filter = a => range === 'ALL' ? a : a.filter(p => p.date >= dateString(cutoff));
  return <div className="p-6 pb-28 space-y-5"><div className="flex gap-1">{['1', '3', '6', '12', 'ALL'].map(r => <button key={r} className={`soft-button flex-1 ${range === r ? 'border border-[#8c8477]' : ''}`} onClick={() => setRange(r)}>{r === 'ALL' ? '全部' : r + '月'}</button>)}</div>
    <Plot title="體重與七日移動平均" points={filter(all.weight)} second={filter(all.average)} unit="kg"/>
    <Plot title="每日熱量攝取" points={filter(all.calories)} unit="kcal"/>
    <Plot title="每日蛋白質攝取" points={filter(all.protein)} unit="g"/>
    <Plot title="每週運動次數（週一開始）" points={filter(all.weekly)} unit="次"/>
  </div>;
}
