import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Auth() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const navigate = useNavigate();

    useEffect(() => {
        console.log('Logging in after osu! redirect');
    
        // make api call to login with code
        fetch('http://localhost:5075/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ code: code })
        })
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(error => {console.error(error)
            return (<><p>Authorization failed!</p></>)
        });
    });


    return (
        <>
            <p>Authorized</p>
        </>
    )
}

export default Auth;