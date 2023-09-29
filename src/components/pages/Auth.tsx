import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IAuthProps } from "./IAuthProps";

function Auth({ isAuthenticated, setIsAuthenticated, setAuthenticatedUser }: IAuthProps) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const navigate = useNavigate();

  const apiLink = process.env.REACT_APP_API_URL;

  useEffect(() => {
    console.log("Logging in after osu! redirect");

    // make api call to login with code
    fetch(apiLink + '/login?code=' + code, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      credentials: "include",
    })
      .then((response) => {
        if (response.status !== 200) {
            throw new Error("Authorization failed!");
        }
        
        setIsAuthenticated(true);
        navigate("/", { replace: true });
      })
      .catch((error) => {
        console.error(error);
        setIsAuthenticated(false);
        return (
          <>
            <p>Authorization failed!</p>
          </>
        );
      });

      fetch(apiLink + "/me", {
        method: "GET",
        credentials: "include",
        })
        .then((response) => response.json())
        .then((data) => {
            setAuthenticatedUser(data);
        })
        .catch((error) => {
            console.error("Error fetching authenticated user:", error);
        });
      
  }, [apiLink, code, navigate, setIsAuthenticated, setAuthenticatedUser]);

  return (
    <>
      <p>Authorized</p>
    </>
  );
}

export default Auth;
