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
            if (isNaN(inputDate.getTime())) return '올바른 날짜 형식을 입력하세요.';
            if (inputDate > today) return '유효한 연령을 입력하세요.';
            return '';
        }
        default:
            return '';
    }
}

module.exports = { validateField };