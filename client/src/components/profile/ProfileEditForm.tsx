interface FormData {
  name: string;
  bio: string;
  date_of_birth: string;
  death_date: string;
  phone: string;
  address: string;
  gender: string;
  hometown: string;
  occupation: string;
}

interface ProfileEditFormProps {
  form: FormData;
  onChange: (key: keyof FormData, value: string) => void;
}

export function ProfileEditForm({ form, onChange }: ProfileEditFormProps) {
  const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500';
  const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Họ tên</label>
        <input type="text" value={form.name} onChange={e => onChange('name', e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Giới thiệu</label>
        <textarea value={form.bio} onChange={e => onChange('bio', e.target.value)} rows={2}
          className={`${inputClass} resize-none`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Giới tính</label>
          <select value={form.gender} onChange={e => onChange('gender', e.target.value)} className={inputClass}>
            <option value="">— Chưa chọn —</option>
            <option value="nam">Nam</option>
            <option value="nữ">Nữ</option>
            <option value="khác">Khác</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Ngày sinh</label>
          <input type="date" value={form.date_of_birth} onChange={e => onChange('date_of_birth', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Quê quán</label>
          <input type="text" value={form.hometown} onChange={e => onChange('hometown', e.target.value)}
            placeholder="Tỉnh/thành phố..." className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nghề nghiệp</label>
          <input type="text" value={form.occupation} onChange={e => onChange('occupation', e.target.value)}
            placeholder="Nghề nghiệp..." className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Điện thoại</label>
        <input type="tel" value={form.phone} onChange={e => onChange('phone', e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Địa chỉ</label>
        <input type="text" value={form.address} onChange={e => onChange('address', e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className={`${labelClass} text-gray-400 dark:text-gray-500`}>Ngày mất <span className="font-normal">(nếu đã qua đời)</span></label>
        <input type="date" value={form.death_date} onChange={e => onChange('death_date', e.target.value)} className={inputClass} />
      </div>
    </div>
  );
}
