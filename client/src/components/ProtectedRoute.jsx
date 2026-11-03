// components/ProtectedRoute/ProtectedRoute.jsx
import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function ProtectedRoute({ children, showLogin }) {
    const auth = useSelector(state => state.auth)
    const isAuthenticated = !!auth.accessToken
    const navigate = useNavigate()

    useEffect(() => {
        if (!isAuthenticated) {
            showLogin()
            navigate('/')
        }
    }, [])

    if (!isAuthenticated) {
        return null
    }

    return children
}

export default ProtectedRoute