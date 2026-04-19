export default function ApplicationLogo(props) {
    return (
        <svg {...props} viewBox="0 0 220 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="JagaSleman">
            <defs>
                <linearGradient id="jagaSlemanGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#991B1B" />
                    <stop offset="100%" stopColor="#7C2D12" />
                </linearGradient>
            </defs>
            <g>
                <rect x="1" y="1" width="46" height="46" rx="12" fill="url(#jagaSlemanGradient)" />
                <path d="M24 11L33 15V23C33 30 28.7 35.8 24 37C19.3 35.8 15 30 15 23V15L24 11Z" fill="#ffffff" fillOpacity="0.95" />
                <path d="M24 17L29 19.5V23.5C29 27.5 26.5 30.8 24 31.6C21.5 30.8 19 27.5 19 23.5V19.5L24 17Z" fill="#991B1B" />
            </g>
            <text x="56" y="22" fontSize="16" fontWeight="700" fill="#111827" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">JagaSleman</text>
            <text x="56" y="36" fontSize="10" fontWeight="500" fill="#6B7280" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">Keamanan Kab. Sleman</text>
        </svg>
    );
}
