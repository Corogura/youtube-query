const apiKey = localStorage.getItem("youtube_api_key");
if (apiKey) {
    document.getElementById('api-input-div').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

const savedCategories = JSON.parse(localStorage.getItem("youtube_categories") || "null");
let currentCategoryIndex = null;
if (!savedCategories) {
    localStorage.setItem("youtube_categories", JSON.stringify([{"name": "メイン", "channels": []}]));
}
for (const category of savedCategories) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category-item';
    categoryDiv.id = `category-${category.name}`;
    categoryDiv.innerHTML = `<span class="category-name">${category.name}</span>`;
    categoryDiv.addEventListener('click', async () => {
        currentCategoryIndex = savedCategories.indexOf(category);
        currentDiv = document.getElementById(`category-${category.name}`);
        currentDiv.classList.remove('category-item');
        currentDiv.classList.add('category-item-selected');
        Array.from(document.getElementsByClassName('category-item-selected')).forEach(div => {
            if (div !== currentDiv) {
                div.classList.remove('category-item-selected');
                div.classList.add('category-item');
            }
        });
        document.getElementById('videos-list').innerHTML = '<div class="loader" style="display:none;"></div>';
        const loader = document.querySelector('.loader');
        loader.style.display = 'block';
        await loadCategoryVideos();
    });
    document.getElementById('channel-categories').appendChild(categoryDiv);
}
currentCategoryIndex = 0;
{
    const currentDiv = document.getElementById(`category-${savedCategories[0].name}`);
    currentDiv.click();
}


const apiButton = document.getElementById('api-button');
apiButton.addEventListener('click', () => {
    const apiKey = document.getElementById('api-key').value;
    if (!apiKey) {
        alert('API keyを入力してください。');
        return;
    }
    localStorage.setItem("youtube_api_key", apiKey);
    alert('API key保存されました。');
    window.location.reload();
});

const changeAPIKeyButton = document.getElementById('change-api-key-button');
changeAPIKeyButton.addEventListener('click', () => {
    localStorage.removeItem("youtube_api_key");
    window.location.reload();
});

const addChannelButton = document.getElementById('add-channel-button');
addChannelButton.addEventListener('click', async () => {
    const channelHandle = document.getElementById('channel-handle').value;
    if (!channelHandle) {
        alert('チャンネルハンドル/IDを入力してください。');
        return;
    }
    try {
        const channelID = await fetchChannelId(channelHandle);
        if (savedCategories[currentCategoryIndex].channels.includes(channelID)) {
            alert('チャンネルは既に追加されています。');
            return;
        }
        savedCategories[currentCategoryIndex].channels.push(channelID);
        localStorage.setItem("youtube_categories", JSON.stringify(savedCategories));
        alert('チャンネルが追加されました。');
        window.location.reload();
    } catch (error) {
        alert(error.message);
        return;
    }
});

const addCategoryButton = document.getElementById('add-category-button');
addCategoryButton.addEventListener('click', () => {
    const categoryName = document.getElementById('category-name').value;
    if (!categoryName) {
        alert('カテゴリ名を入力してください。');
        return;
    }
    if (savedCategories.find(cat => cat.name === categoryName)) {
        alert('同じ名前のカテゴリが既に存在します。');
        return;
    }
    savedCategories.push({name: categoryName, channels: []});
    localStorage.setItem("youtube_categories", JSON.stringify(savedCategories));
    alert('カテゴリが追加されました。');
    window.location.reload();
});

const removeCategoryButton = document.getElementById('remove-category-button');
removeCategoryButton.addEventListener('click', () => {
    if (savedCategories.length === 1) {
        alert('最低1つのカテゴリが必要です。');
        return;
    }
    const categoryName = savedCategories[currentCategoryIndex].name;
    if (!confirm(`カテゴリ "${categoryName}" を削除しますか？この操作は元に戻せません。`)) {
        return;
    }
    savedCategories.splice(currentCategoryIndex, 1);
    localStorage.setItem("youtube_categories", JSON.stringify(savedCategories));
    alert('カテゴリが削除されました。');
    window.location.reload();
});

async function fetchChannelId(handle) {
    let url;
    if (handle[0] === '@') {
        url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`;
    } else if (handle[0] === 'U' && handle.length === 24) {
        url = `https://www.googleapis.com/youtube/v3/channels?part=id&id=${handle}&key=${apiKey}`;
    } else {
        throw new Error('無効なチャンネルハンドル/IDです。');
    }
    const response = await fetch(url);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
        return data.items[0].id;
    } else {
        throw new Error('チャンネルが見つかりませんでした。');
    }
}

async function loadCategoryVideos() {
    const loader = document.querySelector('.loader');
    loader.style.display = 'block';

    if (savedCategories[currentCategoryIndex].channels.length === 0) {
        document.getElementById('videos-list').innerHTML = '<p>チャンネルが追加されていません。上のフォームからチャンネルを追加してください。</p>';
        loader.style.display = 'none';
        return;
    }

    const videosListDiv = document.getElementById('videos-list');
    videosListDiv.innerHTML = '';
    videosListDiv.appendChild(loader);
    const channels = await fetchChannel();
    const videos = [];

    for (const channelId of savedCategories[currentCategoryIndex].channels) {
        const latestVideo = await fetchLatestVideo(channelId);
        if (latestVideo) {
            videos.push(latestVideo);
            videos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));

            videosListDiv.innerHTML = '';
            videosListDiv.appendChild(loader);
            videos.forEach((video, index) => {
                const videoDiv = document.createElement('div');
                if (index === videos.length - 1) {
                    videoDiv.className = 'video-item-last';
                } else {
                    videoDiv.className = 'video-item';
                }
                videoDiv.innerHTML = `
                    <div class="channel-title-section">
                        <img src="${channels.get(video.snippet.channelId + '_thumbnail') || ''}" alt="Channel Thumbnail" class="channel-thumbnail">
                        <div class="channel-title"><h2>${channels.get(video.snippet.channelId + '_title' || '')}</h2><a href="https://www.youtube.com/channel/${video.snippet.channelId}" target="_blank"><img src="yt_icon_red_digital.png" alt="YouTube Icon" class="youtube-icon"></a></div>
                        <button class="remove-channel-button" data-channel-id="${video.snippet.channelId}">チャンネル削除</button>
                    </div>
                    <div class="video-section" videoid="${video.videoId}">
                        <h3>${video.snippet.title}</h3>
                        <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank"><img src="${video.snippet.thumbnails.high.url}" alt="Video Thumbnail" class="video-thumbnail"></a>
                        <p id="status-${video.videoId}">投稿日時: ${new Date(video.snippet.publishedAt).toLocaleString()}</p>
                    </div>
                `;
                videosListDiv.appendChild(videoDiv);
            });
        }
    }

    await fetchVideoStatus();
    addRemoveChannelButtonListeners();
    loader.style.display = 'none';
}

function addRemoveChannelButtonListeners() {
    const removeChannelButtons = document.getElementsByClassName('remove-channel-button');
    Array.from(removeChannelButtons).forEach(button => {
        button.addEventListener('click', (e) => {
            const channelId = e.target.getAttribute('data-channel-id');
            const index = savedCategories[currentCategoryIndex].channels.indexOf(channelId);
            if (index > -1) {
                savedCategories[currentCategoryIndex].channels.splice(index, 1);
                localStorage.setItem("youtube_categories", JSON.stringify(savedCategories));
                alert('チャンネルが削除されました。');
                window.location.reload();
            }
        });
    });
}

async function fetchVideoStatus() {
    const videoDivs = document.getElementsByClassName('video-section');
    const joinedIds = Array.from(videoDivs).map(div => div.getAttribute('videoid')).join(',');
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${joinedIds}&hl=ja&key=${apiKey}`);
    const data = await response.json();
    for (const item of data.items) {
        const videoId = item.id;
        const statusP = document.getElementById(`status-${videoId}`);
        switch (item.snippet.liveBroadcastContent) {
            case 'upcoming':
                statusP.innerHTML = statusP.innerHTML + ` | <span class="video-status">${calculateTimeDifference(item.liveStreamingDetails.scheduledStartTime)}ライブ配信予定</span>`;
                break;
            case 'live':
                statusP.innerHTML = statusP.innerHTML + ' | <span class="video-status-live">ライブ配信中</span>';
                break;
            case 'none':
                statusP.innerHTML = statusP.innerHTML + ' | <span class="video-status">公開中</span>';
                break;
            default:
                statusP.innerHTML = statusP.innerHTML + ' | <span class="video-status">不明</span>';
        }
        if (item.snippet.defaultLanguage && item.snippet.defaultLanguage !== 'ja') {
            const videoTitle = document.querySelector(`div[videoid="${videoId}"] h3`);
            videoTitle.innerHTML = item.snippet.localized.title;
        }
    }
}

function calculateTimeDifference(futureDate) {
    const now = new Date();
    const future = new Date(futureDate);
    const diffInSeconds = Math.floor((future - now) / 1000);
    if (diffInSeconds < 60) {
        return `${diffInSeconds} 秒後`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} 分後`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} 時間後`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} 日後`;
    }
}

async function fetchLatestVideo(channelId) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&channelId=${channelId}&hl=ja&maxResults=3&order=date&type=video&key=${apiKey}`);
    const data = await response.json();
    const items = data.items;
    for (const item of items) {
        if (item.snippet.type === 'upload') {
            item.videoId = item.contentDetails.upload.videoId;
            return item;
        }
    }
    return null;
}

async function fetchChannel() {
    const channel = new Map();
    const channelCount = savedCategories[currentCategoryIndex].channels.length;
    if (channelCount === 0) return channel;
    const channelsString = savedCategories[currentCategoryIndex].channels.join(',');
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&maxResult=${channelCount}&hl=ja&id=${channelsString}&key=${apiKey}`);
    const data = await response.json();
    for (const item of data.items) {
        channel.set(item.id + '_thumbnail', item.snippet.thumbnails.medium.url);
        channel.set(item.id + '_title', item.snippet.localized.title);
    }
    return channel;
}
