/** @noSelfInFile */

declare namespace turtle {

    /**
     * Try to move the turtle forward
     * @returns success
     */
    function forward(): boolean;

    /**
     * Try to move the turtle back
     * @returns success
     */
    function back(): boolean;

    /**
     * Try to move the turtle up
     * @returns success
     */
    function up(): boolean;

    /**
     * Try to move the turtle down
     * @returns success
     */
    function down(): boolean;

    /**
     * Try to turn the turtle left
     * @returns success
     */
    function turnLeft(): boolean;

    /**
     * Try to turn the turtle right
     * @returns success
     */
    function turnRight(): boolean;
}