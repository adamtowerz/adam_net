/** @noSelfInFile */

declare namespace os {
    function reboot(): void;
    function getComputerLabel(): string;
    function setComputerLabel(newLabel: string): void;
}