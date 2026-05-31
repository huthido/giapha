interface FormData {
  name: string;
  bio: string;
  date_of_birth: string;
  phone: string;
  address: string;
}

interface ProfileEditFormProps {
  form: FormData;
  onChange: (key: keyof FormData, value: string) => void;
}

const fields: { label: string; key: keyof FormData; type: string }[] = [
  { label: 'Họ tên', key: 'name', type: 'text' },
  { label: 'Giới thiệu', key: 'bio', type: 'text' },
  { label: 'Ngày sinh', key: 'date_of_birth', type: 'date' },
  { label: 'Điện thoại', key: 'phone', type: 'tel' },
  { label: 'Địa chỉ', key: 'address', type: 'text' },
];

export function ProfileEditForm({ form, onChange }: ProfileEditFormProps) {
  return (
    <div className="space-y-3">
      {fields.map(({ label, key, type }) => (
        <div key={key}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <input
            type={type}
            value={form[key]}
            onChange={e => onChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
          />
        </div>
      ))}
    </div>
  );
}
