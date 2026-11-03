/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { runWorldTransition } from '../utils/worldTransition';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

// The site has two "worlds": dark = Space, light = Arcade. Theme drives the
// in-game board colours; world drives the whole site's personality.
const worldFor = (theme) => (theme === 'light' ? 'arcade' : 'space');

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-world', worldFor(theme));
        localStorage.setItem('theme', theme);
    }, [theme]);

    // The toggle takes the click event so the reveal can grow from the button.
    const toggleTheme = (e) => {
        const next = theme === 'dark' ? 'light' : 'dark';
        const x = e && e.clientX != null ? e.clientX : window.innerWidth - 56;
        const y = e && e.clientY != null ? e.clientY : 42;
        runWorldTransition(x, y, worldFor(next), () => setTheme(next));
    };

    const world = worldFor(theme);

    return (
        <ThemeContext.Provider value={{ theme, world, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
