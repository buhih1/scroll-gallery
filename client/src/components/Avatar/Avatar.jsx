import styles from './Avatar.module.css'

function Avatar({ username, size = 32, className, ...props }) {
    const initial = username?.trim().charAt(0).toUpperCase() || '?';
    const stringToColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = ((hash % 360) + 360) % 360;
        return `hsl(${hue}, 65%, 55%)`;
    }
    const backgroundColor = stringToColor(username || 'default');

    return <div
        className={`${styles.container} ${className || ''}`}
        style={{ backgroundColor, width: size, height: size, fontSize: size * 0.45 }}
        {...props}
    >
        {initial}
    </div>
}


export default Avatar
