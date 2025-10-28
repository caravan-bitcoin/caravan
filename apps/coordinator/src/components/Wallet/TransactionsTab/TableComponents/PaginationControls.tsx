import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Pagination,
  SelectChangeEvent,
} from "@mui/material";

interface Props {
  totalItems: number;
  rowsPerPage: number;
  page: number;
  totalPages: number;
  onPageChange: (event: React.ChangeEvent<unknown>, newPage: number) => void;
  onRowsPerPageChange: (event: SelectChangeEvent<string>) => void;
  rowsPerPageOptions?: number[];
}

export const PaginationControls: React.FC<Props> = ({
  totalItems,
  rowsPerPage,
  page,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25, 50],
}) => {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (page - 1) * rowsPerPage + 1;
  const endItem = Math.min(page * rowsPerPage, totalItems);

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      mt={2}
      px={1}
    >
      <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="rows-per-page-label">Rows</InputLabel>
        <Select
          labelId="rows-per-page-label"
          value={rowsPerPage.toString()}
          onChange={onRowsPerPageChange}
          label="Rows"
        >
          {rowsPerPageOptions.map((option) => (
            <MenuItem key={option} value={option.toString()}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box display="flex" alignItems="center">
        <Typography variant="body2" color="textSecondary" mr={2}>
          {`${startItem}-${endItem} of ${totalItems}`}
        </Typography>
        <Pagination
          count={totalPages}
          page={page}
          onChange={onPageChange}
          color="primary"
          size="small"
        />
      </Box>
    </Box>
  );
};
