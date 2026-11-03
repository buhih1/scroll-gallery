import { createSlice } from "@reduxjs/toolkit";

const initialState = JSON.parse(localStorage.getItem('auth')) ?? { user: '', accessToken: '' }

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => action.payload,
        logout: () => { return { user: '', accessToken: '' } }
    }
})

export const { login, logout } = authSlice.actions
export default authSlice.reducer