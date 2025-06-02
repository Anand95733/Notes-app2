import React from 'react'
import { getInitials } from '../../utils/helper'

const ProfileInfo = ({onLogout,userInfo}) => {
  return (
    <div className='flex items-center gap-3'>
      <div className="w-12 h-12 flex items-center justify-center rounded-full text-slate-950 font-medium bg-slate-100">
          {getInitials(userInfo?.fullName)}
      </div>
      <p className='text-sm font-medium'>{userInfo?.fullName}</p>
      <button className=' underline text-sm text-slate-700' onClick={onLogout}>
        Logout
      </button>
    </div>
  )
}

export default ProfileInfo
