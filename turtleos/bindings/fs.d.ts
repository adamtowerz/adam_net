/**
 * @noSelfInFile
 */

declare interface FileHandle {
    /**
     * @noSelf
     */
    write(text: string): void;
    /**
     * @noSelf
     */
    close(): void;
}

declare let fs: {
    /**
     * Opens a file and returns a file handle
     * @param name name of the file
     * @param flags e.g. "w" for read
     * @noSelf
     */
    open(name: string, flags: string): FileHandle;

    /**
     * Deletes the file, no effect if target is missing
     * @noSelf
     */
    delete(name: string): void;
}