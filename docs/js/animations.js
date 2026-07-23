document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const heroImage = document.querySelector('.hero-image-container');
    if (heroImage && !reduceMotion && finePointer) {
        document.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth / 2 - e.pageX) / 50;
            const y = (window.innerHeight / 2 - e.pageY) / 50;
            
            heroImage.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
        });

        document.addEventListener('mouseleave', () => {
            heroImage.style.transform = `perspective(1000px) rotateX(2deg)`;
        });
    }
});
