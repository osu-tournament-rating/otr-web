import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatarCard from './cards/UserAvatarCard';
import NavBar from '../NavBar';
import UserRankingCard from './cards/UserRankingCard';
import RatingHistoryChart from './cards/RatingHistoryChartExample';

function Dashboard({ isAuthenticated }: { isAuthenticated: boolean }) {
    const [player, setPlayer] = useState(null);
    const [mode, setMode] = useState(0);
    const navigate = useNavigate();
    const apiLink = process.env.REACT_APP_API_URL;

    useEffect(() => {
        fetch(apiLink + '/me', {
            method: 'GET',
            credentials: 'include',
        })
            .then(response => response.json())
            .then(data => {
                setPlayer(data);
            })
            .catch(error => {
                console.error('Error fetching player data, auth key likely expired:', error);
                return navigate('/unauthorized', { replace: true });
            });
    }, []); // The empty dependency array ensures this effect runs only once, similar to componentDidMount

    return (
        <>
        <NavBar />
        
        { player &&
            <div className='flex m-10 space-x-4'>
                <UserAvatarCard osuId={player['osuId']} />
                <UserRankingCard rankingClass="Platinum" rating="1500" globalRank="27405" countryRank='5000' percentile='54.6' nextRankingClass='Diamond' ratingRemainingForNextRank='500'></UserRankingCard>
            </div>
        }
        </>
    )
}

export default Dashboard;
