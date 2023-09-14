import { useEffect, useState } from 'react';
import UserAvatarCard from './cards/UserAvatarCard';
import NavBar from '../NavBar';
import { useNavigate } from 'react-router-dom';
import UserRankingCard from './cards/UserRankingCard';

function Dashboard() {
    const [player, setPlayer] = useState(null);
    const [mode, setMode] = useState(0);

    useEffect(() => {
        fetch('http://localhost:5075/api/me', {
            method: 'GET',
            credentials: 'include',
        })
            .then(response => response.json())
            .then(data => {
                setPlayer(data);
                console.log(data);
            })
            .catch(error => {
                console.error('Error fetching player data:', error);
            });
    }, []); // The empty dependency array ensures this effect runs only once, similar to componentDidMount

    return (
        <>
        <NavBar />
        
        { player &&
            <div className='flex mx-20'>
                <UserAvatarCard osuId={player['osuId']} />
                <UserRankingCard rankingClass="Platinum" rating="1500" globalRank="27405" countryRank='5000' percentile='54.6' nextRankingClass='Diamond' ratingRemainingForNextRank='500'></UserRankingCard>
            </div>
        }
        </>
    )
}

export default Dashboard;
