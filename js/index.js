const CONSTANTS = {
    DEFAULT_DURATION: 6000,// デフォルトスライド表示時間
    PROGRESS_UPDATE_INTERVAL: 50,// 進捗バー更新間隔
    SCROLL_DEBOUNCE: 150,
    DRAG_SPEED_MULTIPLIER: 2,
    ACTIVE_THRESHOLD: 0.6,// スライドアクティブ判定の閾値
    SECTION_THRESHOLD: 0.3
};

const container = document.getElementById('scroll-area');
const indicatorsContainer = document.getElementById('indicators');

const state = {
    autoPlayInterval: null,
    progressInterval: null,
    isAutoPlay: true,
    pausedTime: 0,
    totalDuration: CONSTANTS.DEFAULT_DURATION,
    startTime: 0,
    isDragging: false,
    dragStartX: 0,
    dragScrollLeft: 0
};

const getActiveElements = () => {
    const activeBox = container?.querySelector('.box.active');
    const video = activeBox?.querySelector('.box-bg');
    const isVideo = video?.tagName === 'VIDEO';
    return { activeBox, video: isVideo ? video : null };
};

const getVideoDuration = (video) => {
    if (!video) return CONSTANTS.DEFAULT_DURATION;
    
    if (video.readyState >= 2 && video.duration && !isNaN(video.duration)) {
        return video.duration * 1000;
    }
    
    video.addEventListener('loadedmetadata', () => {
        if (video.duration && !isNaN(video.duration)) {
            state.totalDuration = video.duration * 1000;
        }
    }, { once: true });
    
    return CONSTANTS.DEFAULT_DURATION;
};

const getCurrentSlideDuration = () => {
    const { video } = getActiveElements();
    return getVideoDuration(video);
};

const updateUI = (isPlaying) => {
    const btnIcon = document.querySelector('#auto-play-btn span');
    const carouselControls = document.querySelector('.carousel-controls');
    
    if (btnIcon) {
        btnIcon.textContent = isPlaying ? 'pause' : 'play_arrow';
    }
    if (carouselControls) {
        carouselControls.classList.toggle('paused', !isPlaying);
    }
};

const controlVideo = (shouldPlay) => {
    const { video } = getActiveElements();
    if (!video) return;
    
    if (shouldPlay) {
        video.play().catch(() => {});
    } else {
        video.pause();
    }
};

const stopAllVideos = () => {
    container.querySelectorAll('.box').forEach(box => {
        const video = box.querySelector('.box-bg');
        if (video?.tagName === 'VIDEO') {
            video.pause();
        }
    });
};

const setupDragScroll = () => {
    const handleMouseDown = (e) => {
        state.isDragging = true;
        state.dragStartX = e.pageX - container.offsetLeft;
        state.dragScrollLeft = container.scrollLeft;
        container.style.scrollBehavior = 'auto';
    };

    const handleMouseUp = () => {
        state.isDragging = false;
        container.style.scrollBehavior = 'smooth';
    };

    const handleMouseMove = (e) => {
        if (!state.isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - state.dragStartX) * CONSTANTS.DRAG_SPEED_MULTIPLIER;
        container.scrollLeft = state.dragScrollLeft - walk;
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);
};

const setupIndicators = () => {
    const boxes = container.querySelectorAll('.box');
    const dotsHtml = Array.from(boxes).map((_, i) => 
        `<div class="dot ${i === 0 ? 'active' : ''}" onclick="scrollToSlide(${i})"></div>`
    ).join('');
    indicatorsContainer.innerHTML = dotsHtml;
};

const updateActiveIndicator = (index) => {
    const dots = indicatorsContainer.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        const isActive = i === index;
        dot.classList.toggle('active', isActive);
        dot.style.setProperty('--progress', '0%');
    });
    
    state.pausedTime = 0;
    state.startTime = Date.now();
    
    if (state.isAutoPlay) {
        startProgressAnimation();
    }
};

const startProgressAnimation = (resumeProgress = 0) => {
    if (!state.isAutoPlay) return;
    
    if (state.progressInterval) {
        clearInterval(state.progressInterval);
    }
    
    const activeDot = indicatorsContainer.querySelector('.dot.active');
    if (!activeDot) return;
    
    const duration = getCurrentSlideDuration();
    state.totalDuration = duration;
    
    let progress = resumeProgress;
    const step = 100 / (duration / CONSTANTS.PROGRESS_UPDATE_INTERVAL);
    
    state.progressInterval = setInterval(() => {
        progress += step;
        if (progress >= 100) {
            progress = 100;
            clearInterval(state.progressInterval);
        }
        activeDot.style.setProperty('--progress', `${progress}%`);
    }, CONSTANTS.PROGRESS_UPDATE_INTERVAL);
};

const setupScrollObserver = () => {
    const options = {
        root: container,
        threshold: CONSTANTS.ACTIVE_THRESHOLD
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                stopAllVideos();
                container.querySelectorAll('.box').forEach(box => {
                    box.classList.remove('active');
                });
                
                entry.target.classList.add('active');
                
                if (state.isAutoPlay) {
                    controlVideo(true);
                }
                
                const index = parseInt(entry.target.id.split('-')[1]);
                updateActiveIndicator(index);
            }
        });
    }, options);

    container.querySelectorAll('.box').forEach(box => {
        observer.observe(box);
    });
};

const scrollToSlide = (index) => {
    const slide = document.getElementById(`slide-${index}`);
    if (slide) {
        slide.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest', 
            inline: 'center' 
        });
        resetAutoPlay();
    }
};

const startAutoPlay = (resumeFromPause = false) => {
    if (!state.isAutoPlay) return;
    
    const getCurrentIndex = () => {
        const dots = indicatorsContainer.querySelectorAll('.dot');
        return Array.from(dots).findIndex(dot => dot.classList.contains('active'));
    };
    
    const moveToNextSlide = () => {
        if (!state.isAutoPlay) return;
        
        const boxes = container.querySelectorAll('.box');
        const currentIndex = getCurrentIndex();
        const nextIndex = (currentIndex + 1) % boxes.length;
        
        state.pausedTime = 0;
        scrollToSlide(nextIndex);
    };
    
    const scheduleNextSlide = () => {
        if (!state.isAutoPlay) return;
        
        const duration = getCurrentSlideDuration();
        state.totalDuration = duration;
        
        let remainingTime = duration;
        if (resumeFromPause && state.pausedTime > 0) {
            remainingTime = duration - state.pausedTime;
        } else {
            state.startTime = Date.now();
        }
        
        state.autoPlayInterval = setTimeout(() => {
            if (!state.isAutoPlay) return;
            moveToNextSlide();
            scheduleNextSlide();
        }, remainingTime);
    };
    
    scheduleNextSlide();
};

const resetAutoPlay = () => {
    if (state.isAutoPlay) {
        clearTimeout(state.autoPlayInterval);
        state.pausedTime = 0;
        state.startTime = Date.now();
        startAutoPlay();
    }
};

const toggleAutoPlay = () => {
    const activeDot = indicatorsContainer.querySelector('.dot.active');
    
    if (state.isAutoPlay) {
        state.isAutoPlay = false;
        
        const elapsed = Date.now() - state.startTime;
        state.pausedTime += elapsed;
        
        clearTimeout(state.autoPlayInterval);
        clearInterval(state.progressInterval);
        
        updateUI(false);
        controlVideo(false);
    } else {
        state.isAutoPlay = true;
        
        const currentProgress = activeDot ? 
            parseFloat(activeDot.style.getPropertyValue('--progress') || '0') : 0;
        
        updateUI(true);
        controlVideo(true);
        
        startAutoPlay(true);
        startProgressAnimation(currentProgress);
        
        state.startTime = Date.now();
    }
};

const setupSectionObserver = () => {
    const profileSection = document.querySelector('.profile');
    if (!profileSection) return;

    const options = {
        root: null,
        threshold: CONSTANTS.SECTION_THRESHOLD
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!state.isAutoPlay) {
                    state.isAutoPlay = true;
                    startAutoPlay();
                    startProgressAnimation();
                    updateUI(true);
                }
            } else {
                if (state.isAutoPlay) {
                    state.isAutoPlay = false;
                    clearInterval(state.autoPlayInterval);
                    clearInterval(state.progressInterval);
                    updateUI(false);
                }
            }
        });
    }, options);

    observer.observe(profileSection);
};

function toggleVideo(videoId, btnElement) {
    const video = document.getElementById(videoId);
    if (!video) return;
    
    const iconSpan = btnElement.querySelector('span');
    const box = video.closest('.box');

    if (video.paused) {
        video.play();
        if (iconSpan) iconSpan.textContent = 'pause';
        if (box) box.classList.add('playing');
    } else {
        video.pause();
        if (iconSpan) iconSpan.textContent = 'play_arrow';
        if (box) box.classList.remove('playing');
    }
}

function setupVideoEvents() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.addEventListener('timeupdate', () => {
            const videoId = video.id;
            const progressFill = document.getElementById(`progress-${videoId}`);
            if (progressFill && video.duration) {
                const percentage = (video.currentTime / video.duration) * 100;
                progressFill.style.width = `${percentage}%`;
            }
        });
        
        video.addEventListener('ended', () => {
            const btn = video.closest('.box')?.querySelector('.play-btn span');
            if (btn) btn.textContent = 'play_arrow';
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!container || !indicatorsContainer) {
        console.warn('Profile section elements not found');
        return;
    }
    
    setupIndicators();
    setupScrollObserver();
    setupVideoEvents();
    setupSectionObserver();
    setupDragScroll();
    startAutoPlay();

    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            resetAutoPlay();
        }, CONSTANTS.SCROLL_DEBOUNCE);
    }, { passive: true });
});
