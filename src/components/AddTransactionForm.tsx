import React, { useState } from 'react';
import { PlusCircle, MinusCircle, Calendar, Tag, FileText, IndianRupee, Wallet } from 'lucide-react';
import type { LedgerItem } from '../services/gist';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AddTransactionFormProps {
  onAdd: (item: LedgerItem) => void;
  isLoading?: boolean;
}

const CATEGORIES = {
  expense: ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '其他'],
  income: ['工资', '奖金', '投资', '兼职', '其他'],
};

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onAdd, isLoading }) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    const newItem: LedgerItem = {
      id: crypto.randomUUID(),
      date,
      amount: Math.abs(Number(amount)),
      category,
      remark,
      type,
    };

    onAdd(newItem);
    // 重置部分表单
    setAmount('');
    setRemark('');
  };

  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType);
    setCategory(CATEGORIES[newType][0]);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-xl font-semibold mb-6 text-slate-800 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-indigo-500" />
        记一笔
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 类型切换 */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm font-medium",
              type === 'expense' 
                ? "bg-white text-rose-500 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <MinusCircle className="w-4 h-4" />
            支出
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm font-medium",
              type === 'income' 
                ? "bg-white text-emerald-500 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <PlusCircle className="w-4 h-4" />
            收入
          </button>
        </div>

        {/* 金额输入 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            金额
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-lg font-semibold transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 分类选择 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              分类
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none"
            >
              {CATEGORIES[type].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 日期选择 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              日期
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* 备注 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            备注 (可选)
          </label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="备注点什么..."
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-white transition-all shadow-lg shadow-indigo-200 active:scale-95",
            type === 'expense' ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600",
            isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          {isLoading ? '正在保存...' : '确认录入'}
        </button>
      </form>
    </div>
  );
};
