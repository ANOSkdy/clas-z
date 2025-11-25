'use client';

import { useState } from 'react';

export default function CompanyInfo() {
  const [isEditing, setIsEditing] = useState(false);

  // 単一の会社データ（必要に応じてDBやAPIから取得する形に変更可能）
  const company = {
    name: '株式会社ロジスティクス・コア',
    address: '北海道札幌市中央区北1条西1丁目',
    phone: '011-123-4567',
    email: 'info@logicore.example.com',
    registrationNumber: 'T1234567890123',
    representative: '山田 太郎',
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">会社情報</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          {isEditing ? '編集をキャンセル' : '情報を編集'}
        </button>
      </div>

      <div className="space-y-6">
        {/* 基本情報 */}
        <section>
          <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">基本情報</h4>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-600">会社名</label>
              <div className="md:col-span-2">
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={company.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{company.name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-600">住所</label>
              <div className="md:col-span-2">
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={company.address}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800">{company.address}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-600">代表者名</label>
              <div className="md:col-span-2">
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={company.representative}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800">{company.representative}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-600">インボイス登録番号</label>
              <div className="md:col-span-2">
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={company.registrationNumber}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 font-mono">{company.registrationNumber}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* 連絡先 */}
        <section>
          <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">連絡先</h4>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-600">電話番号</label>
              <div className="md:col-span-2">
                {isEditing ? (
                  <input
                    type="tel"
                    defaultValue={company.phone}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800">{company.phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-600">Email</label>
              <div className="md:col-span-2">
                {isEditing ? (
                  <input
                    type="email"
                    defaultValue={company.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800">{company.email}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {isEditing && (
          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm">
              変更を保存
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
