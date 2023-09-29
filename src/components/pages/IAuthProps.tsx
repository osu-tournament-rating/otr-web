export interface IAuthProps {
    isAuthenticated: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    setAuthenticatedUser: (authenticatedUser: any) => void;
}