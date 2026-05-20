import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Book as BookType } from '../types';
import { TrendingUp, BookOpen, Clock, Heart, Award } from 'lucide-react';

interface ReadingInsightsProps {
  books: BookType[];
}

export default function ReadingInsights({ books }: ReadingInsightsProps) {
  const statusData = [
    { name: 'Reading', value: books.filter(b => b.status === 'reading').length, color: '#0071E3' },
    { name: 'Finished', value: books.filter(b => b.status === 'read').length, color: '#34C759' },
    { name: 'Wishlist', value: books.filter(b => b.status === 'want-to-read').length, color: '#8E8E93' },
    { name: 'Shelved', value: books.filter(b => b.status === 'dnf').length, color: '#FF3B30' },
  ].filter(d => d.value > 0);

  const genreCounts = books.reduce((acc: Record<string, number>, book) => {
    const genre = book.genre || 'Uncategorized';
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {});

  const genreData = Object.entries(genreCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const totalPages = books.reduce((sum, b) => sum + (b.pages || 0), 0);
  const avgPages = books.length > 0 ? Math.round(totalPages / books.length) : 0;
  const likedCount = books.filter(b => b.liked).length;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<BookOpen className="w-4 h-4" />} label="Collection Size" value={books.length} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Total Pages Read" value={totalPages.toLocaleString()} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Avg. Depth" value={avgPages} subLabel="pages per book" />
        <StatCard icon={<Heart className="w-4 h-4" />} label="Resonant Works" value={likedCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="mac-card bg-[#121212]/50 border-neutral-800 p-8 h-[400px] flex flex-col">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500 mb-8 flex items-center gap-2">
            <Award className="w-3 h-3" />
            Library State
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '10px', paddingTop: '20px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genre Breakdown */}
        <div className="mac-card bg-[#121212]/50 border-neutral-800 p-8 h-[400px] flex flex-col">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500 mb-8">Top Resonances (Genres)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genreData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8E8E93', fontSize: 10 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                />
                <Bar dataKey="value" fill="#FFFFFF20" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subLabel }: { icon: React.ReactNode, label: string, value: string | number, subLabel?: string }) {
  return (
    <div className="mac-card bg-[#121212] border-neutral-900 p-6 flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-4 text-neutral-400">
        {icon}
      </div>
      <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="serif-italic text-3xl text-white">{value}</span>
        {subLabel && <span className="text-[9px] text-neutral-500 uppercase font-bold">{subLabel}</span>}
      </div>
    </div>
  );
}
