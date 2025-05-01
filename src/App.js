import React, { useEffect, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Topmain from './components/Topmain';
import Playlists from './components/Playlists';
import Player from './components/Player';
import Addons from './components/Addons';
import RecommendedArtists from './components/RecommendedArtists';
import axios from 'axios'; // for making API calls

function App() {
    const clientID = ""; 
    const redirectURI = "http://localhost:5173/"; // Redirect URI
    const responseType = "token"; // Response type

    const scopes = [
        "streaming", // Required for playback
        "user-read-email",
        "user-read-private",
        "user-read-playback-state",
        "user-modify-playback-state"
    ].join("%20");
    
    const authEndpoint = `https://accounts.spotify.com/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&response_type=${responseType}&scope=${scopes}`;

    const [token, setToken] = useState(""); // Token for API calls
    const [searchKey, setSearchKey] = useState(""); // User's search query
    const [artists, setArtists] = useState([]); // List of artists
    const [profile, setProfile] = useState(null); // User profile data

    const [queue, setQueue] = useState([
        "spotify:track:5KE9b4x7Zj2A8XtbkqhqTe", // Post Malone
        "spotify:track:6nSHtgTH5a959xPucs6Ilb", // Hoody
        "spotify:track:3RwWW7KeVhHGayYJgUL5eZ", // Ariana Grande 
        "spotify:track:6AI3ezQ4o3HUoP6Dhudph3", // Kendric Larmar
        "spotify:track:6WzRpISELf3YglGAh7TXcG", // The weekend
        "spotify:track:1iArAuiiDPjtZcwO33YeLF", // Dean
        "spotify:track:4K5d58UkmjqNsA7kY43jgt", // Pink Sweat$
        "spotify:track:2CGNAOSuO1MEFCbBRgUzjd", // Kendric Lamar
        "spotify:track:2McTSCNNzxgDtAqiuibhPI", // LAVY
        "spotify:track:5vNRhkKd0yEAg8suGBpjeY", // ROSE       
    ]);

    const [currentTrack, setCurrentTrack] = useState(null); // Currently playing track
    const [history, setHistory] = useState([]); // Track previously played songs
    const [myAddons, setMyAddons] = useState([]); // Stores user-selected podcasts
    
    // Extract token from URL or LocalStorage
    useEffect(() => {
        const hash = window.location.hash;
        let token = window.localStorage.getItem("token");

        if (!token && hash) {
            token = hash
                .substring(1)
                .split("&")
                .find((elem) => elem.startsWith("access_token"))
                .split("=")[1];
            window.localStorage.setItem("token", token); 
            window.location.hash = ""; 
        }

        setToken(token); 
        console.log("Token after authentication:", token);
    }, []);

    // Fetch user profile when token is available
    useEffect(() => {
        if (token) {
            const fetchProfile = async () => {
                try {
                    const { data } = await axios.get("https://api.spotify.com/v1/me", {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    setProfile(data); // Save user profile data
                } catch (error) {
                    console.error("Error fetching profile:", error);
                }
            };
            fetchProfile();
        }
    }, [token]);

    // Again useEffect() is the React.js hook that allows to perform side effect (fetching data with)
    // Initialize Playback SDK
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
    
        script.onload = () => {
            window.onSpotifyWebPlaybackSDKReady = () => {
                const player = new window.Spotify.Player({
                    name: "My Vibe App",
                    getOAuthToken: cb => {
                        const token = window.localStorage.getItem("token");
                        if (!token) {
                            console.error("No token found. Ensure you're logged in and authenticated.");
                            return;
                        }
                        cb(token);
                    },
                    volume: 0.5,
                });
    
                player.addListener("ready", ({ device_id }) => {
                    console.log("SDK is ready and connected with Device ID:", device_id);
                });
    
                player.addListener("not_ready", ({ device_id }) => {
                    console.warn("Device ID has gone offline:", device_id);
                });
    
                player.connect().then(success => {
                    if (success) {
                        console.log("The Web Playback SDK successfully connected to Spotify!");
                    } else {
                        console.error("The Web Playback SDK failed to connect.");
                    }
                }).catch(error => {
                    console.error("An error occurred during SDK connection:", error);
                });
            };
        };
    
        script.onerror = () => {
            console.error("Failed to load the Spotify Web Playback SDK script.");
        };
    
        return () => {
            document.body.removeChild(script);
        };
    }, []);

     // Effect to update queue when `myAddons` changes
     useEffect(() => {
        insertPodcastsIntoQueue();
    }, [myAddons]);
       
    // Logout function
    const logout = () => {
        setToken("");
        setSearchKey("");
        setMyAddons([]); // Clear My Add-ons on logout
        setQueue([]); // Clear queue on logout
        setCurrentTrack(null); // Clear current track
        setHistory([]); // Clear history
        window.localStorage.removeItem("token");
        setProfile(null); // Clear profile on logout
    };

    const addToMyAddons = (podcast) => {
        setMyAddons((prev) => {
            if (prev.some((item) => item.url === podcast.url)) {
                return prev;
            }
            return [...prev, podcast];
        });
    };

     // Remove podcast from My Add-ons
     const removeFromMyAddons = (podcast) => {
        setMyAddons((prev) => prev.filter((item) => item.url !== podcast.url));
    };   

    // Function to insert podcasts after every 3 songs
    const insertPodcastsIntoQueue = () => {
        if (myAddons.length === 0) return; // No podcasts to insert
    
        const updatedQueue = queue.filter((track) => !myAddons.some((podcast) => podcast.url === track)); // Remove duplicate podcasts
        let index = 3; // Start inserting after every 3 songs
    
        myAddons.forEach((podcast) => {
            if (index <= updatedQueue.length) {
                updatedQueue.splice(index, 0, podcast.url); // Insert podcast into queue
                index += 4; // Skip 3 songs before inserting the next podcast
            }
        });
    
        setQueue(updatedQueue);
    };

    // Search for artists using Spotify API
    const searchArtists = async (e) => {
        e.preventDefault();
        if (!token) return;
    
        try {
            const { data } = await axios.get("https://api.spotify.com/v1/search", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: {
                    q: searchKey, // User's search input
                    type: "track", // Search for tracks
                    limit: 15, // Limit the number of results
                },
            });
    
            setArtists(data.tracks.items); // Save tracks to display
        } catch (error) {
            console.error("Error fetching tracks:", error);
        }
    };

    // Playback
    const startPlayback = async (trackURI) => {
        if (!token) {
            console.error("Token is missing. Ensure you're logged in.");
            return;
        }
    
        try {
            const response = await fetch("https://api.spotify.com/v1/me/player/play", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ uris: [trackURI] }), // Replace with a valid Spotify track URI
            });
    
            if (response.ok) {
                console.log("Playback started successfully!");
            } else {
                console.error("Error starting playback:", response.statusText);
            }
        } catch (error) {
            console.error("Error during playback:", error);
        }
    };    

    // Render artist data
    const renderArtists = () => {
        return artists.map((track) => (
            <div key={track.id} className="track-item">
                <img 
                    src={track.album.images[0]?.url} 
                    alt={track.name} 
                    width="130" 
                />
                <div>
                    <h4>{track.name}</h4>
                    <p>{track.artists.map((artist) => artist.name).join(", ")}</p>
                </div>
                {/* Play button for each track */}
                <button className='playbutton' onClick={() => startPlayback(track.uri)}>Play</button>
            </div>
        ));
    };



    return (
        <div className="App">
            <Sidebar profile={profile} token={token} />
            <main>
                <div className="content">
                    <Topmain
                        token={token}
                        logout={logout}
                        loginUrl={authEndpoint}
                    />
                    {token && (
                        <section className="search-section">
                            <form onSubmit={searchArtists}>
                                <input
                                    type="text"
                                    placeholder="Search Artists"
                                    onChange={(e) => setSearchKey(e.target.value)}
                                />
                                <button type="submit">Search</button>
                            </form>
                            <div className="artist-results">{renderArtists()}</div>
                        </section>
                    )}
                    <Playlists addToMyAddons={addToMyAddons} token={token} />
                    <RecommendedArtists />
                </div>
                <Addons myAddons={myAddons} removeFromMyAddons={removeFromMyAddons} />
            </main>
            <Player
                startPlayback={startPlayback}
                queue={queue}
                setQueue={setQueue}
                currentTrack={currentTrack}
                setCurrentTrack={setCurrentTrack}
                history={history}
                setHistory={setHistory}
            />
        </div>
    );
}

export default App;
