export default function formatRelativeTime(dateString) {
    const now = new Date();
    const target = new Date(dateString);
    const diffSeconds = Math.floor((now - target) / 1000);

    if (diffSeconds < 60) {
        return '방금';
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes}분`
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}시간`
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return `${diffDays}일`
    }

    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 4) {
        return `${diffWeeks}주`
    }

    let months =
        (now.getFullYear() - target.getFullYear()) * 12 +
        (now.getMonth() - target.getMonth());

    if (now.getDate() < target.getDate()) {
        months -= 1;
    }

    if (months < 12) {
        return `${months}개월`
    }

    const years = Math.floor(months / 12);
    return `${years}년`
}