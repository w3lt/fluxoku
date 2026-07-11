export type Move = {
  value: number;
  position: [number, number];
};

type Mask = {
  rowMask: number[];
  columnMask: number[];
  boxMask: number[];
};

type Board = ReadonlyArray<ReadonlyArray<number>>;

const BOARD_SIZE = 9;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const FULL_DIGIT_MASK = (1 << BOARD_SIZE) - 1;

export default class Solution {
  /**
   * An immutable snapshot of the board passed to the constructor.
   */
  public readonly board: Board;

  private ballPosition: [number, number];

  /**
   * Either the board is solved or not
   */
  private isSolved: boolean;

  /**
   * The full solved board
   */
  private solvedBoard: number[][];

  /**
   * The moves to solve the board
   */
  private solvedMoves: Array<Move>;

  /**
   * The move index, used to keep track of current move. (When consumer calls `nextMoves`, `moveIndex` will be increased by one)
   */
  private moveIndex: number;

  /**
   * The masks for solving the board
   */
  private masks: Mask;

  /**
   * Creates a solver for a Sudoku board and the ball's starting position.
   * @param board The 9x9 board to solve, where zero represents an empty cell.
   * @param ballPosition The ball's starting row and column.
   */
  constructor(board: number[][], ballPosition: [number, number]) {
    const boardSnapshot = board.map((row) => Object.freeze([...row]));
    const masks = this.validateBoard(boardSnapshot);
    this.validatePosition(ballPosition);

    this.board = Object.freeze(boardSnapshot);
    this.ballPosition = [ballPosition[0], ballPosition[1]];
    this.solvedBoard = boardSnapshot.map((row) => [...row]);
    this.solvedMoves = [];
    this.isSolved = false;
    this.moveIndex = -1;
    this.masks = masks;
  }

  /**
   * Calculates the used-digit masks for every row, column, and 3x3 box.
   * @param board The board whose masks should be calculated.
   * @returns The row, column, and box masks for the board.
   * @throws {Error} When a cell is invalid or a unit contains duplicate digits.
   */
  private calculateMasks(board: Board): Mask {
    const rowMask = Array<number>(BOARD_SIZE).fill(0);
    const columnMask = Array<number>(BOARD_SIZE).fill(0);
    const boxMask = Array<number>(BOARD_SIZE).fill(0);

    for (let row = 0; row < BOARD_SIZE; ++row) {
      for (let column = 0; column < BOARD_SIZE; ++column) {
        const value = board[row][column];
        if (!Number.isInteger(value) || value < 0 || value > BOARD_SIZE) {
          throw new Error("Board values must be integers between 0 and 9");
        }

        if (value === 0) continue;

        const valueMask = this.getMask(value);
        const box = this.getBox(row, column);
        if (
          (rowMask[row] & valueMask) !== 0 ||
          (columnMask[column] & valueMask) !== 0 ||
          (boxMask[box] & valueMask) !== 0
        ) {
          throw new Error(
            "Board cannot contain duplicate values in a row, column, or box",
          );
        }

        rowMask[row] |= valueMask;
        columnMask[column] |= valueMask;
        boxMask[box] |= valueMask;
      }
    }

    return {
      rowMask,
      columnMask,
      boxMask,
    };
  }

  /**
   * Validates the board shape and contents and calculates its masks.
   * @param board The board to validate.
   * @returns The masks for the validated board.
   * @throws {Error} When the board is not a valid partial 9x9 Sudoku board.
   */
  private validateBoard(board: Board): Mask {
    if (
      board.length !== BOARD_SIZE ||
      board.some((row) => row.length !== BOARD_SIZE)
    ) {
      throw new Error("Board length must be equal to 9");
    }

    return this.calculateMasks(board);
  }

  /**
   * Get mask of a value
   * @param value
   * @returns
   */
  private getMask(value: number): number {
    return 2 ** (value - 1);
  }

  /**
   * Checks whether a board still contains an empty cell.
   * @param board The board to inspect.
   * @returns Whether at least one cell contains zero.
   */
  private includeEmptyCell(board: number[][]): boolean {
    return board.flatMap((r) => [...r]).includes(0);
  }

  /**
   * Solve the board
   * @param board The board to solve
   */
  private solveBoard(board: number[][]): boolean {
    this.masks = this.validateBoard(board);

    if (!this.includeEmptyCell(board)) {
      return true;
    }

    // Find the cell with fewest candidates
    let choice: {
      position: [number, number];
      candidates: number[];
    } | null = null;
    for (let i = 0; i < 9; ++i) {
      for (let j = 0; j < 9; ++j) {
        if (board[i][j] !== 0) continue;
        const boxNumber = this.getBox(i, j);
        const used =
          this.masks.rowMask[i] |
          this.masks.columnMask[j] |
          this.masks.boxMask[boxNumber];

        let candidatesMask = FULL_DIGIT_MASK & ~used;

        const candidates: number[] = [];
        for (
          let index = 0;
          candidatesMask !== 0;
          index++, candidatesMask >>>= 1
        ) {
          if (candidatesMask & 1) {
            candidates.push(index + 1);
          }
        }

        if (choice === null || candidates.length < choice.candidates.length) {
          choice = {
            candidates,
            position: [i, j],
          };
        }
      }
    }

    // Check if there's some candidates
    if (choice === null) {
      throw new Error("Choice position cannot be -1");
    }

    if (choice.candidates.length === 0) return false;

    for (const candidate of choice.candidates) {
      board[choice.position[0]][choice.position[1]] = candidate;

      // Cache the current masks
      const cachedMasks = this.masks;

      if (this.solveBoard(board)) return true;

      board[choice.position[0]][choice.position[1]] = 0;
      this.masks = cachedMasks;
    }

    return false;
  }

  /**
   * Validates that a row-column position is inside the board.
   * @param position The position to validate.
   * @throws {Error} When either coordinate is not an integer from 0 through 8.
   */
  private validatePosition(position: [number, number]): void {
    if (
      position.some(
        (coordinate) =>
          !Number.isInteger(coordinate) ||
          coordinate < 0 ||
          coordinate >= BOARD_SIZE,
      )
    ) {
      throw new Error("Ball position must be inside the 9x9 board");
    }
  }

  /**
   * Searches for an order in which the ball can visit every originally empty cell.
   * Updates the stored moves when a route is found.
   * @returns Whether a complete route was found for the solved board.
   */
  private search(): boolean {
    if (!this.isSolved) return false;

    this.validatePosition(this.ballPosition);

    if (this.board[this.ballPosition[0]][this.ballPosition[1]] === 0)
      return false;

    this.solvedMoves = [];
    this.moveIndex = 0;

    let remaining = 0n;
    for (let row = 0; row < BOARD_SIZE; ++row) {
      for (let col = 0; col < BOARD_SIZE; ++col) {
        if (this.board[row][col] === 0) {
          remaining |= this.cellBit(row * 9 + col);
        }
      }
    }

    const route = this.searchRoute(
      this.toIndex(this.ballPosition),
      remaining,
      new Set<string>(),
    );
    if (route === null) return false;

    this.solvedMoves = route.map((index) => {
      const position = this.toPosition(index);
      return {
        value: this.solvedBoard[position[0]][position[1]],
        position,
      };
    });
    return true;
  }

  /**
   * Solves the board and searches for the corresponding sequence of ball moves.
   */
  public solve() {
    if (this.isSolved) {
      return;
    }

    const workingBoard = this.board.map((row) => row.slice());
    const solveBoardResult = this.solveBoard(workingBoard);
    this.isSolved = solveBoardResult;

    if (solveBoardResult) {
      this.solvedBoard = workingBoard;
    }

    const searchResult = this.search();
    if (!searchResult) this.isSolved = false;
  }

  /**
   * Returns the next move in the solved route and advances the move cursor.
   * @returns The next move, or null when no solved move is available.
   */
  public nextMoves(): Move | null {
    if (!this.isSolved || this.moveIndex === this.solvedMoves.length)
      return null;

    return this.solvedMoves[this.moveIndex++];
  }

  /**
   * Creates the bit that represents a board cell in a cell-set mask.
   * @param index The zero-based flattened cell index.
   * @returns A mask containing only the indexed cell.
   */
  private cellBit(index: number): bigint {
    return 1n << BigInt(index);
  }

  /** Returns a winning suffix of cell indices, or null when the state fails. */
  private searchRoute(
    ball: number,
    remaining: bigint,
    failedStates: Set<string>,
  ): number[] | null {
    if (remaining === 0n) return [];

    const stateKey = `${remaining.toString(16)}:${ball}`;
    if (failedStates.has(stateKey)) return null;

    const options: Array<{ index: number; onward: number }> = [];
    for (let index = 0; index < CELL_COUNT; index++) {
      if (!this.hasCell(remaining, index) || !this.reaches(ball, index))
        continue;

      const nextRemaining = remaining & ~this.cellBit(index);
      const onward = this.countReachable(index, nextRemaining);
      if (nextRemaining !== 0n && onward === 0) continue;
      options.push({ index, onward });
    }

    options.sort((a, b) => a.onward - b.onward);

    for (const option of options) {
      const nextRemaining = remaining & ~this.cellBit(option.index);
      if (nextRemaining !== 0n && !this.isConnected(nextRemaining)) continue;

      const suffix = this.searchRoute(
        option.index,
        nextRemaining,
        failedStates,
      );
      if (suffix !== null) return [option.index, ...suffix];
    }

    failedStates.add(stateKey);
    return null;
  }

  /**
   * Converts a row-column position to a flattened cell index.
   * @param position The row and column to convert.
   * @returns The zero-based flattened cell index.
   */
  private toIndex(position: [number, number]): number {
    return position[0] * BOARD_SIZE + position[1];
  }

  /**
   * Converts a flattened cell index to a row-column position.
   * @param index The zero-based flattened cell index.
   * @returns The corresponding row and column.
   */
  private toPosition(index: number): [number, number] {
    return [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE];
  }

  /**
   * Checks whether a cell is present in a cell-set mask.
   * @param mask The cell-set mask to inspect.
   * @param index The zero-based flattened cell index.
   * @returns Whether the indexed cell is present.
   */
  private hasCell(mask: bigint, index: number): boolean {
    return (mask & this.cellBit(index)) !== 0n;
  }

  /**
   * Checks whether the ball can move directly between two cells.
   * Cells are reachable when they share a row, column, or 3x3 box.
   * @param a The flattened index of the starting cell.
   * @param b The flattened index of the destination cell.
   * @returns Whether the cells are distinct and directly reachable.
   */
  private reaches(a: number, b: number): boolean {
    if (a === b) return false;
    const [aRow, aColumn] = this.toPosition(a);
    const [bRow, bColumn] = this.toPosition(b);
    return (
      aRow === bRow ||
      aColumn === bColumn ||
      this.getBox(aRow, aColumn) === this.getBox(bRow, bColumn)
    );
  }

  /**
   * Gets the flattened index of the 3x3 box containing a cell.
   * @param row The cell's row.
   * @param column The cell's column.
   * @returns The zero-based box index.
   */
  private getBox(row: number, column: number): number {
    return Math.floor(row / 3) * 3 + Math.floor(column / 3);
  }

  /**
   * Counts the remaining cells directly reachable from the ball.
   * @param ball The flattened index of the ball's current cell.
   * @param remaining A mask of cells that have not been visited.
   * @returns The number of directly reachable remaining cells.
   */
  private countReachable(ball: number, remaining: bigint): number {
    let count = 0;
    for (let index = 0; index < CELL_COUNT; index++) {
      if (this.hasCell(remaining, index) && this.reaches(ball, index)) count++;
    }
    return count;
  }

  /**
   * Checks whether all remaining cells form one connected reachability graph.
   * @param remaining A mask of cells that have not been visited.
   * @returns Whether every remaining cell can be reached from every other one.
   */
  private isConnected(remaining: bigint): boolean {
    if (remaining === 0n) return true;

    let first = -1;
    for (let index = 0; index < CELL_COUNT; index++) {
      if (this.hasCell(remaining, index)) {
        first = index;
        break;
      }
    }

    let visited = this.cellBit(first);
    const queue = [first];
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      for (let index = 0; index < CELL_COUNT; index++) {
        if (
          this.hasCell(remaining, index) &&
          !this.hasCell(visited, index) &&
          this.reaches(current, index)
        ) {
          visited |= this.cellBit(index);
          queue.push(index);
        }
      }
    }

    return visited === remaining;
  }
}
