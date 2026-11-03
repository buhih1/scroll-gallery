import styles from './AuthModal.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { faPinterest } from '@fortawesome/free-brands-svg-icons'
import { useEffect, useRef, useState } from 'react'
import Button from '../Button/Button'
import { useDispatch } from 'react-redux'
import { login } from '../../store/authSlice'
import useClickOutside from '../../hooks/useClickOutside'

function validateField(field, value) {
    switch (field) {
        case 'email':
            if (!value) return '이메일 주소를 입력하세요.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '올바른 이메일 주소를 입력하세요.';
            return '';

        case 'password':
            if (!value || value.length < 8) return '문자, 숫자, 기호를 8개 이상 사용하세요.';
            return '';

        case 'birth': {
            if (!value) return '생일을 입력하세요.';
            const inputDate = new Date(value);
            const today = new Date();
            if (isNaN(inputDate.getTime())) return '올바른 날짜 형식을 입력하세요.'
            if (inputDate > today) return '유효한 연령을 입력하세요.';
            return '';
        }
        default:
            return '';

    }
}

function validateAll(mode, form) {
    const errors = {};
    let fields = ['email', 'password'];
    if (mode === 'register') fields.push('birth');

    fields.forEach((field) => {
        const message = validateField(field, form[field]);
        if (message) errors[field] = message;
    });
    return errors;
}

function AuthModal(props) {
    const [mode, setMode] = useState(props.mode);
    const [form, setForm] = useState({ email: '', password: '', birth: '' })
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const dispatch = useDispatch()
    const modalRef = useRef(null);
    useClickOutside(modalRef, props.onClose)

    useEffect(() => {
        setForm((prev) => ({ ...prev, password: '', birth: '' }));
        setErrors({});
    }, [mode])

    const handleChange = (field) => (e) => {
        const value = e.target.value;
        const newForm = { ...form, [field]: value };
        setForm(newForm);
    }

    const handleRegister = async (e) => {
        e.preventDefault();

        const validationErrors = validateAll(mode, form);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('http://localhost:4000/api/auth/register', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json();

            if (!res.ok) {
                setErrors((prev) => ({ ...prev, submit: data.error }));
                return;
            }

            localStorage.setItem('auth', JSON.stringify(data))
            dispatch(login(data))

            props.onClose();
        } catch (err) {
            setErrors((prev) => ({ ...prev, submit: '네트워크 연결을 확인해주세요.' }))
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        const validationErrors = validateAll(mode, form);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('http://localhost:4000/api/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json();

            if (!res.ok) {
                setErrors((prev) => ({ ...prev, submit: data.error }));
                return;
            }

            localStorage.setItem('auth', JSON.stringify(data))
            dispatch(login(data))

            props.onClose();
        } catch (err) {
            setErrors((prev) => ({ ...prev, submit: '네트워크 연결을 확인해주세요.' }))
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div ref={modalRef} className={styles.modalContainer}>
                <div className={styles.modalWrap}>
                    <div className={styles.closeContainer}>
                        <FontAwesomeIcon onClick={props.onClose} icon={faXmark} size='xl' />
                    </div>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <div className={styles.logoContainer}>
                                <FontAwesomeIcon className={styles.logo} icon={faPinterest} />
                            </div>
                            <h1>Pinterest에 오신 것을 환영합니다</h1>
                            {
                                mode === 'register'
                                    ?
                                    <p>Pinterest에 무료로 가입하여 더 많은 아이디어를 찾아보세요.</p>
                                    :
                                    <p>회원님만을 위한 더 많은 아이디어를 찾아보려면 로그인하세요.</p>
                            }
                        </div>
                        <div className={styles.modalBody}>
                            {mode === 'register'
                                ?
                                <form className={styles.form} onSubmit={handleRegister} noValidate>
                                    <input className={errors.email && styles.errorBorder} name='email' type="email" value={form.email} onChange={handleChange('email')} placeholder='이메일을 입력하세요.' />
                                    {errors.email && <p className={styles.error} style={{ paddingTop: '1px', paddingBottom: '8px' }}><FontAwesomeIcon icon={faTriangleExclamation} /> {errors.email}</p>}

                                    <input className={errors.password && styles.errorBorder} name='password' type="password" value={form.password} onChange={handleChange('password')} placeholder='비밀번호를 입력하세요.' />
                                    {errors.password && <p className={styles.error}><FontAwesomeIcon icon={faTriangleExclamation} /> {errors.password}</p>}
                                    <p className={styles.alert}>문자, 숫자, 기호를 8개 이상 사용하세요.</p>

                                    <input className={errors.birth && styles.errorBorder} name='birth' type="date" value={form.birth} onChange={handleChange('birth')} placeholder='생일을 입력하세요(mm/dd/yyyy)' />
                                    {errors.birth && <p className={styles.error}><FontAwesomeIcon icon={faTriangleExclamation} /> {errors.birth}</p>}

                                    <Button type='submit' disabled={isSubmitting}>계속하기</Button>
                                    {errors.submit && <p className={styles.error}><FontAwesomeIcon icon={faTriangleExclamation} /> {errors.submit}</p>}
                                </form>
                                :
                                <form className={styles.form} onSubmit={handleLogin} noValidate>
                                    <input className={errors.email && styles.errorBorder} name='email' type="email" value={form.email} onChange={handleChange('email')} placeholder='이메일을 입력하세요.' />
                                    {errors.email && <p className={styles.error} style={{ paddingTop: '1px', paddingBottom: '8px' }}><FontAwesomeIcon icon={faTriangleExclamation} /> 음... 올바른 이메일 주소가 아닙니다.</p>}

                                    <input className={errors.password && styles.errorBorder} name='password' type="password" value={form.password} onChange={handleChange('password')} placeholder='비밀번호를 입력하세요.' />
                                    {errors.password && <p className={styles.error}><FontAwesomeIcon icon={faTriangleExclamation} /> 올바르지 않은 비밀번호를 입력했습니다.</p>}

                                    <Button type='submit' disabled={isSubmitting}>로그인</Button>
                                    {errors.submit && <p className={styles.error}><FontAwesomeIcon icon={faTriangleExclamation} /> {errors.submit}</p>}
                                </form>
                            }
                        </div>
                        <div className={styles.modalFooter}>
                            {mode === 'register' && <p className={styles.loginPrompt}>이미 계정이 있나요? <a onClick={() => setMode('login')}>로그인</a></p>}
                            {mode === 'login' && <p className={styles.loginPrompt}>Pinterest에 처음 오셨나요? <a onClick={() => setMode('register')}>무료로 가입</a></p>}

                            {mode === 'register' && <p className={styles.termsNotice}>계속하면 Pinterest의 <a>서비스 약관</a>에 동의하고 <a>개인정보 보호정책</a>을 읽었음을 인정한 것으로 간주합니다. <a>컬렉션 알림</a>.</p>}
                            {mode === 'login' && <p className={styles.termsNotice}><a>서비스 약관</a> · <a>개인정보 보호정책</a> · <a>컬렉션 알림</a></p>}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default AuthModal