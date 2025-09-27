const apiKey = localStorage.getItem("youtube_api_key");
if (apiKey) {
    document.getElementById('api-input-div').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

const savedChannels = JSON.parse(localStorage.getItem("youtube_channels") || "[]");

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
        alert('チャンネルハンドルを入力してください。');
        return;
    }
    try {
        const channelID = await fetchChannelId(channelHandle);
        if (savedChannels.includes(channelID)) {
            alert('チャンネルは既に追加されています。');
            return;
        }
        savedChannels.push(channelID);
        localStorage.setItem("youtube_channels", JSON.stringify(savedChannels));
        alert('チャンネルが追加されました。');
        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
});

async function fetchChannelId(handle) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
        return data.items[0].id;
    } else {
        throw new Error('チャンネルが見つかりませんでした。');
    }
}

let loadedChannels = 0;
const channelsPerLoad = 5;

document.addEventListener('DOMContentLoaded', loadChannels);
document.addEventListener('scrollend', loadChannels);

async function loadChannels() {
    const channelThumbnails = await fetchChannelThumbnails();
    const videos = [];
    const channelsToLoad = savedChannels.slice(loadedChannels, loadedChannels + channelsPerLoad);
    for (const channelId of channelsToLoad) {
        const latestVideo = await fetchLatestVideo(channelId);
        if (latestVideo) {
            videos.push(latestVideo);
        }
    }
    loadedChannels += channelsToLoad.length;
    videos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
    for (const video of videos) {
        const videoDiv = document.createElement('div');
        videoDiv.className = 'video-item';
        videoDiv.innerHTML = `
            <div class="channel-title">
                <img src="${channelThumbnails.get(video.snippet.channelId) || ''}" alt="Channel Thumbnail" class="channel-thumbnail">
                <h2>${video.snippet.channelTitle} </h2>
                <button class="remove-channel-button" data-channel-id="${video.snippet.channelId}">チャンネル削除</button>
            </div>
            <div class="video-section">
                <h3>${video.snippet.title}</h3>
                <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank"><img src="${video.snippet.thumbnails.high.url}" alt="Video Thumbnail"></a>
                <p>投稿日時: ${new Date(video.snippet.publishedAt).toLocaleString()}</p>
            </div>
        `;
        document.getElementById('videos-list').appendChild(videoDiv);
    }
    const removeChannelButtons = document.getElementsByClassName('remove-channel-button');
    Array.from(removeChannelButtons).forEach(button => {
        button.addEventListener('click', (e) => {
            const channelId = e.target.getAttribute('data-channel-id');
            const index = savedChannels.indexOf(channelId);
            if (index > -1) {
                savedChannels.splice(index, 1);
                localStorage.setItem("youtube_channels", JSON.stringify(savedChannels));
                alert('チャンネルが削除されました。');
                window.location.reload();
            }
        });
    });
}

async function fetchLatestVideo(channelId) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&channelId=${channelId}&maxResults=3&order=date&type=video&key=${apiKey}`);
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

async function fetchChannelThumbnails() {
    const channelThumbnails = new Map();
    const channelCount = savedChannels.length;
    if (channelCount === 0) return channelThumbnails;
    const channelsString = savedChannels.join(',');
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&maxResult=${channelCount}&id=${channelsString}&key=${apiKey}`);
    const data = await response.json();
    for (const item of data.items) {
        channelThumbnails.set(item.id, item.snippet.thumbnails.medium.url);
    }
    return channelThumbnails;
}
