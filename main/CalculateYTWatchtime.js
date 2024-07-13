const fs = require("fs");

/**
 * Rounds a number to the specified number of decimal places.
 *
 * @param {number} number - The number to be rounded.
 * @param {number} decimals - The desired number of decimal places.
 * @returns {number} - The rounded number.
 */
function round(number, decimals)
{
    return Math.round((number + Number.EPSILON) * (10**decimals)) / (10**decimals)
}

/**
 * Converts a duration in seconds to a string representation of days, hours, minutes, and seconds.
 *
 * @param {number} seconds - The duration in seconds to be converted.
 * @returns {string} - The string representation of the duration in days, hours, minutes, and seconds.
 */
function secondsToDhms(seconds) 
{
    seconds = Number(seconds);

    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    
    const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";

    return dDisplay + hDisplay + mDisplay + sDisplay;
}

/**
 * Converts an ISO 8601 duration to the corresponding duration in seconds.
 *
 * @param {string} duration - The ISO 8601 duration string to be converted.
 * @returns {number} - The duration in seconds.
 */
function convertISO8601DurationToSeconds(duration) 
{
    //Duration zero || duration more than a day (lofi girl stream e.g. or super similar super long videos)
    if (duration === "P0D" || duration.includes("D"))
    {
        return 0;
    }

    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);

    const totalSeconds = (hours*60*60) + (minutes*60) + seconds;

    return totalSeconds <= maxVideoDurationSeconds ? totalSeconds : 0; //purge videos longer than `maxVideoDurationSeconds` seconds. These are often streams (or super long videos) and such that we never fully watched.
}

/**
 * Retrieves the durations of videos corresponding to the given video IDs.
 *
 * @param {string[]} videoIds - An array of video IDs for which to retrieve the durations.
 * @returns {Promise<Object[]>} - A promise that resolves to an array of objects containing the video ID and duration in seconds.
 */
async function getVideoDurations(videoIds) 
{
    let queriedData = []; //Contains an array of objects with the id and durationSeconds of each video
    let idsToQuery = []; 

    const queryIds = async (ids) => {
        console.log(`Querying progress: ${round(((queriedData.length + ids.length)/videoIds.length)*100, 2)}% - ${queriedData.length + ids.length}/${videoIds.length}`);
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${ids.join(',')}&key=${ytApiKey}&part=contentDetails`);
        const data = await response.json();
        data.items.forEach(item => {
            const duration = item.contentDetails.duration;
            const formattedDuration = convertISO8601DurationToSeconds(duration);
            queriedData.push({ id: item.id, durationSeconds: formattedDuration });
        });
    };

    for (id of videoIds)
    {
        if (idsToQuery.length < 50) //The maximum number of videos we can request from the API is 50
        {
            idsToQuery.push(id);
        }
        else
        {
            await queryIds(idsToQuery);
            idsToQuery = [];
        }
    }

    if (idsToQuery.length > 0) 
    {
        await queryIds(idsToQuery);
    }

    return queriedData;
}


/**
 * Entry point that retrieves watch history data, processes it, and calculates the total watch time.
 */
const watchHistoryFileName = process.argv[2]; //The JSON file containing the watch history data
const ytApiKey = process.argv[3]; //YouTube Data API v3 key
const maxVideoDurationSeconds = process.argv[4] || 2400; //Videos longer than this duration wont be taken into consideration when calculating the total watch time

(async() => {
const data = fs.readFileSync(watchHistoryFileName, 'utf8');

// Parse the JSON data
try 
{
    const watchHistory = JSON.parse(data);

    const stillAvailableVideos = watchHistory.map(element => {
        if (element.titleUrl != null)
        {
            const youtubeUrl = element.titleUrl;
            const indexId = youtubeUrl.indexOf("watch?v=") + "watch?v=".length;
            const videoId = youtubeUrl.substring(indexId);

            return {id: videoId, published: element.time, title: element.title, channel: element.subtitles ? element.subtitles[0].name : "Unknown"};
        }
        else //When a video has been deleted
        {
            return null;
        }      
    }).filter(element => element); //Remove the `null` elements, i.e. the deleted videos

    let availableVideosWithWatchtime = await getVideoDurations(stillAvailableVideos.map(video =>  video.id));

    let merged = [];
    for(let i=0; i < availableVideosWithWatchtime.length; i++) 
    {
        console.log(`Merging progress: ${round((i/availableVideosWithWatchtime.length)*100, 2)}% - ${i}/${availableVideosWithWatchtime.length}`);

        merged.push({
         ...availableVideosWithWatchtime[i], 
         ...(stillAvailableVideos.find((itmInner) => itmInner.id === availableVideosWithWatchtime[i].id))}
        ); //Combine the 2 arrays into a single array, where each object in the merged array contains: id, durationSeconds, published, title and channel
    }

    fs.writeFileSync("./WatchHistoryWithDuration.json", JSON.stringify(merged, null, 4), "utf-8");

    console.log(`From: ${merged[merged.length - 1].published} until ${merged[0].published}`);
    console.log(`Total amount of videos: ${merged.length}`);
    console.log(`Total watchtime: ${secondsToDhms(merged.reduce((accumulator, video) => accumulator + video.durationSeconds, 0))}`)
} 
catch (parseError) 
{
    console.error('Error parsing JSON:', parseError);
}
})();