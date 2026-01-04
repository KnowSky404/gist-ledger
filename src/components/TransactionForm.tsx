import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Calendar, Tag, FileText, IndianRupee, Wallet, Save } from 'lucide-react';
import type { LedgerItem } from '../services/gist';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TransactionFormProps {
  onSubmit: (item: LedgerItem) => void;
  isLoading?: boolean;
  initialData?: LedgerItem | null;
  onCancel?: () => void;
}

const CATEGORIES = {
  expense: ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '其他'],
  income: ['工资', '奖金', '投资', '兼职', '其他'],
};

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, isLoading, initialData, onCancel }) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState('');

  // 初始化回显数据
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDate(initialData.date);
      setRemark(initialData.remark || '');
    } else {
        // Reset defaults if needed when switching back to "Add" mode
        setType('expense');
        setAmount('');
        setCategory(CATEGORIES.expense[0]);
        setDate(new Date().toISOString().split('T')[0]);
        setRemark('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    const newItem: LedgerItem = {
      id: initialData ? initialData.id : crypto.randomUUID(), // 如果是编辑，保留原ID
      date,
      amount: Math.abs(Number(amount)),
      category,
      remark,
      type,
    };

    onSubmit(newItem);
    
    // 如果是新增模式，清空表单以便继续输入
    if (!initialData) {
        setAmount('');
        setRemark('');
    }
  };

  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType);
    // 切换类型时，重置分类为该类型的第一个
    // 注意：如果是编辑模式且类型没变，不要重置分类（这里逻辑简化处理，编辑时切换类型重置分类也合理）
    setCategory(CATEGORIES[newType][0]);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-xl font-semibold mb-6 text-slate-800 flex items-center gap-2">
        {initialData ? <Save className="w-5 h-5 text-indigo-500" /> : <Wallet className="w-5 h-5 text-indigo-500" />}
        {initialData ? '编辑记录' : '记一笔'}
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

        {/* 操作按钮 */}
        <div className="flex gap-3">
            {initialData && onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                    取消
                </button>
            )}
            <button
            type="submit"
            disabled={isLoading}
            className={cn(
                "flex-1 py-3 rounded-xl font-semibold text-white transition-all shadow-lg shadow-indigo-200 active:scale-95",
                type === 'expense' ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600",
                isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            >
            {isLoading ? '保存中...' : (initialData ? '保存修改' : '确认录入')}
            </button>
        </div>
      </form>
    </div>
  );
};